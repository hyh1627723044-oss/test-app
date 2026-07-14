package handlers

import (
	"net/http"
	"strconv"

	"recipe-planner-go/internal/httpx"
)

func (h Handler) ListFavorites(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	recipes, err := h.queryRecipes(r, recipeSelectSQL+`
		JOIN favorites f ON f.recipe_id = r.id
		WHERE f.user_id = $3 AND (r.is_public = TRUE OR r.owner_id = $1 OR $2)
	`+recipeGroupBySQL+" ORDER BY max(f.created_at) DESC", user.ID, user.IsAdmin, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, recipes)
}

func (h Handler) AddFavorite(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	recipeID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid recipe id")
		return
	}
	if ok, err := h.canReadRecipe(r, recipeID, user.ID, user.IsAdmin); err != nil || !ok {
		httpx.Error(w, http.StatusNotFound, "Recipe not found")
		return
	}
	_, err = h.DB.ExecContext(r.Context(), `
		INSERT INTO favorites (user_id, recipe_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, user.ID, recipeID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.NoContent(w)
}

func (h Handler) DeleteFavorite(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	recipeID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid recipe id")
		return
	}
	_, err = h.DB.ExecContext(r.Context(), "DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2", user.ID, recipeID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.NoContent(w)
}
