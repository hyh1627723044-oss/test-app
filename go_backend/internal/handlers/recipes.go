package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"recipe-planner-go/internal/httpx"
	"recipe-planner-go/internal/models"
)

type recipePayload struct {
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	CookTimeMinutes int      `json:"cook_time_minutes"`
	Ingredients     []string `json:"ingredients"`
	ImageURLs       []string `json:"image_urls"`
	TagIDs          []int64  `json:"tag_ids"`
	IsPublic        bool     `json:"is_public"`
}

func (h Handler) ListRecipes(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	keyword := strings.TrimSpace(r.URL.Query().Get("keyword"))
	mine := r.URL.Query().Get("mine") == "true"
	tagID, _ := strconv.ParseInt(r.URL.Query().Get("tag_id"), 10, 64)

	args := []any{user.ID, user.IsAdmin}
	where := []string{}
	if mine {
		where = append(where, fmt.Sprintf("r.owner_id = $%d", len(args)+1))
		args = append(args, user.ID)
	} else {
		where = append(where, "(r.is_public = TRUE OR r.owner_id = $1 OR $2)")
	}
	if keyword != "" {
		where = append(where, fmt.Sprintf("r.title ILIKE $%d", len(args)+1))
		args = append(args, "%"+keyword+"%")
	}
	if tagID > 0 {
		where = append(where, fmt.Sprintf("EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_id = $%d)", len(args)+1))
		args = append(args, tagID)
	}
	query := recipeSelectSQL + " WHERE " + strings.Join(where, " AND ") + recipeGroupBySQL + " ORDER BY r.created_at DESC"
	recipes, err := h.queryRecipes(r, query, args...)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, recipes)
}

func (h Handler) CreateRecipe(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	var payload recipePayload
	if err := httpx.Decode(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := validateRecipePayload(payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.assertTagsUsable(r, payload.TagIDs, user.ID); err != nil {
		httpx.Error(w, http.StatusForbidden, err.Error())
		return
	}

	tx, err := h.DB.BeginTx(r.Context(), nil)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	ingredients, _ := json.Marshal(payload.Ingredients)
	imageURLs, _ := json.Marshal(payload.ImageURLs)
	var recipeID int64
	err = tx.QueryRowContext(r.Context(), `
		INSERT INTO recipes (owner_id, title, description, cook_time_minutes, ingredients, image_urls, is_public)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, user.ID, strings.TrimSpace(payload.Title), payload.Description, payload.CookTimeMinutes, ingredients, imageURLs, payload.IsPublic).Scan(&recipeID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := replaceRecipeTags(r, tx, recipeID, payload.TagIDs); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := tx.Commit(); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.GetRecipeByID(w, r, recipeID)
}

func (h Handler) GetRecipe(w http.ResponseWriter, r *http.Request) {
	recipeID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid recipe id")
		return
	}
	h.GetRecipeByID(w, r, recipeID)
}

func (h Handler) GetRecipeByID(w http.ResponseWriter, r *http.Request, recipeID int64) {
	user := httpx.CurrentUser(r)
	recipes, err := h.queryRecipes(r, recipeSelectSQL+" WHERE r.id = $3 AND (r.is_public = TRUE OR r.owner_id = $1 OR $2)"+recipeGroupBySQL, user.ID, user.IsAdmin, recipeID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(recipes) == 0 {
		httpx.Error(w, http.StatusNotFound, "Recipe not found")
		return
	}
	httpx.JSON(w, http.StatusOK, recipes[0])
}

func (h Handler) UpdateRecipe(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	recipeID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid recipe id")
		return
	}
	if ok, err := h.canEditRecipe(r, recipeID, user.ID, user.IsAdmin); err != nil || !ok {
		httpx.Error(w, http.StatusForbidden, "You cannot edit this recipe")
		return
	}
	var payload recipePayload
	if err := httpx.Decode(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := validateRecipePayload(payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.assertTagsUsable(r, payload.TagIDs, user.ID); err != nil {
		httpx.Error(w, http.StatusForbidden, err.Error())
		return
	}

	tx, err := h.DB.BeginTx(r.Context(), nil)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()
	ingredients, _ := json.Marshal(payload.Ingredients)
	imageURLs, _ := json.Marshal(payload.ImageURLs)
	_, err = tx.ExecContext(r.Context(), `
		UPDATE recipes
		SET title = $1, description = $2, cook_time_minutes = $3, ingredients = $4, image_urls = $5, is_public = $6, updated_at = now()
		WHERE id = $7
	`, strings.TrimSpace(payload.Title), payload.Description, payload.CookTimeMinutes, ingredients, imageURLs, payload.IsPublic, recipeID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := replaceRecipeTags(r, tx, recipeID, payload.TagIDs); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := tx.Commit(); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.GetRecipeByID(w, r, recipeID)
}

func (h Handler) DeleteRecipe(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	recipeID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid recipe id")
		return
	}
	result, err := h.DB.ExecContext(r.Context(), `
		DELETE FROM recipes
		WHERE id = $1 AND (owner_id = $2 OR $3)
	`, recipeID, user.ID, user.IsAdmin)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if count, _ := result.RowsAffected(); count == 0 {
		httpx.Error(w, http.StatusNotFound, "Recipe not found")
		return
	}
	httpx.NoContent(w)
}

func (h Handler) queryRecipes(r *http.Request, query string, args ...any) ([]models.Recipe, error) {
	user := httpx.CurrentUser(r)
	rows, err := h.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipes := []models.Recipe{}
	for rows.Next() {
		var recipe models.Recipe
		var ingredientsRaw, imageURLsRaw, tagIDsRaw, tagsRaw []byte
		if err := rows.Scan(
			&recipe.ID, &recipe.OwnerID, &recipe.Title, &recipe.Description, &recipe.CookTimeMinutes,
			&ingredientsRaw, &imageURLsRaw, &recipe.IsPublic, &recipe.CreatedAt, &tagIDsRaw, &tagsRaw,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(ingredientsRaw, &recipe.Ingredients)
		_ = json.Unmarshal(imageURLsRaw, &recipe.ImageURLs)
		_ = json.Unmarshal(tagIDsRaw, &recipe.TagIDs)
		_ = json.Unmarshal(tagsRaw, &recipe.Tags)
		recipe.CanEdit = user.IsAdmin || recipe.OwnerID == user.ID
		recipes = append(recipes, recipe)
	}
	return recipes, rows.Err()
}

func validateRecipePayload(payload recipePayload) error {
	title := strings.TrimSpace(payload.Title)
	if title == "" || len([]rune(title)) > 128 {
		return errors.New("title must be 1-128 characters")
	}
	if payload.CookTimeMinutes < 0 || payload.CookTimeMinutes > 1440 {
		return errors.New("cook_time_minutes must be between 0 and 1440")
	}
	if len(payload.ImageURLs) > 9 || len(payload.TagIDs) > 12 {
		return errors.New("too many images or tags")
	}
	return nil
}

func (h Handler) assertTagsUsable(r *http.Request, tagIDs []int64, userID int64) error {
	for _, tagID := range tagIDs {
		var exists bool
		err := h.DB.QueryRowContext(r.Context(), `
			SELECT EXISTS(SELECT 1 FROM tags WHERE id = $1 AND (owner_id IS NULL OR owner_id = $2))
		`, tagID, userID).Scan(&exists)
		if err != nil || !exists {
			return errors.New("cannot use another user's tag")
		}
	}
	return nil
}

func (h Handler) canEditRecipe(r *http.Request, recipeID int64, userID int64, isAdmin bool) (bool, error) {
	var ok bool
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT EXISTS(SELECT 1 FROM recipes WHERE id = $1 AND (owner_id = $2 OR $3))
	`, recipeID, userID, isAdmin).Scan(&ok)
	return ok, err
}

func replaceRecipeTags(r *http.Request, tx *sql.Tx, recipeID int64, tagIDs []int64) error {
	if _, err := tx.ExecContext(r.Context(), "DELETE FROM recipe_tags WHERE recipe_id = $1", recipeID); err != nil {
		return err
	}
	for _, tagID := range tagIDs {
		if _, err := tx.ExecContext(r.Context(), "INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2)", recipeID, tagID); err != nil {
			return err
		}
	}
	return nil
}

const recipeSelectSQL = `
SELECT
  r.id, r.owner_id, r.title, r.description, r.cook_time_minutes,
  r.ingredients, r.image_urls, r.is_public, r.created_at,
  COALESCE(jsonb_agg(t.id ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '[]'::jsonb) AS tag_ids,
  COALESCE(jsonb_agg(t.name ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '[]'::jsonb) AS tags
FROM recipes r
LEFT JOIN recipe_tags rt ON rt.recipe_id = r.id
LEFT JOIN tags t ON t.id = rt.tag_id
`

const recipeGroupBySQL = " GROUP BY r.id"
