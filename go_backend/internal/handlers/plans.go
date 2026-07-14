package handlers

import (
	"net/http"
	"strconv"
	"time"

	"recipe-planner-go/internal/httpx"
	"recipe-planner-go/internal/models"
)

type planItemCreateRequest struct {
	RecipeID int64  `json:"recipe_id"`
	MealSlot string `json:"meal_slot"`
	Note     string `json:"note"`
}

type planItemUpdateRequest struct {
	MealSlot string `json:"meal_slot"`
	Note     string `json:"note"`
}

func (h Handler) GetPlan(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	planDate := r.URL.Query().Get("date")
	if _, err := time.Parse("2006-01-02", planDate); err != nil {
		httpx.Error(w, http.StatusBadRequest, "date must be YYYY-MM-DD")
		return
	}
	planID, err := h.ensurePlan(r, user.ID, planDate)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	items, err := h.queryPlanItems(r, planID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, models.Plan{ID: planID, PlanDate: planDate, Items: items})
}

func (h Handler) AddPlanItem(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	planDate := r.PathValue("date")
	if _, err := time.Parse("2006-01-02", planDate); err != nil {
		httpx.Error(w, http.StatusBadRequest, "plan date must be YYYY-MM-DD")
		return
	}
	var payload planItemCreateRequest
	if err := httpx.Decode(r, &payload); err != nil || payload.RecipeID == 0 || payload.MealSlot == "" {
		httpx.Error(w, http.StatusBadRequest, "recipe_id and meal_slot are required")
		return
	}
	if ok, err := h.canReadRecipe(r, payload.RecipeID, user.ID, user.IsAdmin); err != nil || !ok {
		httpx.Error(w, http.StatusNotFound, "Recipe not found")
		return
	}
	planID, err := h.ensurePlan(r, user.ID, planDate)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	var itemID int64
	err = h.DB.QueryRowContext(r.Context(), `
		INSERT INTO meal_plan_items (meal_plan_id, recipe_id, meal_slot, note)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, planID, payload.RecipeID, payload.MealSlot, payload.Note).Scan(&itemID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	item, err := h.queryPlanItem(r, itemID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, item)
}

func (h Handler) UpdatePlanItem(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	itemID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid item id")
		return
	}
	var payload planItemUpdateRequest
	if err := httpx.Decode(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	result, err := h.DB.ExecContext(r.Context(), `
		UPDATE meal_plan_items mpi
		SET meal_slot = COALESCE(NULLIF($1, ''), meal_slot),
		    note = $2
		FROM meal_plans mp
		WHERE mpi.meal_plan_id = mp.id AND mpi.id = $3 AND mp.user_id = $4
	`, payload.MealSlot, payload.Note, itemID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if count, _ := result.RowsAffected(); count == 0 {
		httpx.Error(w, http.StatusNotFound, "Plan item not found")
		return
	}
	item, err := h.queryPlanItem(r, itemID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

func (h Handler) DeletePlanItem(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	itemID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid item id")
		return
	}
	result, err := h.DB.ExecContext(r.Context(), `
		DELETE FROM meal_plan_items mpi
		USING meal_plans mp
		WHERE mpi.meal_plan_id = mp.id AND mpi.id = $1 AND mp.user_id = $2
	`, itemID, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if count, _ := result.RowsAffected(); count == 0 {
		httpx.Error(w, http.StatusNotFound, "Plan item not found")
		return
	}
	httpx.NoContent(w)
}

func (h Handler) ensurePlan(r *http.Request, userID int64, planDate string) (int64, error) {
	var planID int64
	err := h.DB.QueryRowContext(r.Context(), `
		INSERT INTO meal_plans (user_id, plan_date)
		VALUES ($1, $2)
		ON CONFLICT (user_id, plan_date) DO UPDATE SET plan_date = EXCLUDED.plan_date
		RETURNING id
	`, userID, planDate).Scan(&planID)
	return planID, err
}

func (h Handler) queryPlanItems(r *http.Request, planID int64) ([]models.PlanItem, error) {
	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT mpi.id, mpi.recipe_id, mpi.meal_slot, mpi.note, r.title, COALESCE(r.image_urls->>0, '')
		FROM meal_plan_items mpi
		JOIN recipes r ON r.id = mpi.recipe_id
		WHERE mpi.meal_plan_id = $1
		ORDER BY mpi.sort_order, mpi.id
	`, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []models.PlanItem{}
	for rows.Next() {
		var item models.PlanItem
		if err := rows.Scan(&item.ID, &item.RecipeID, &item.MealSlot, &item.Note, &item.RecipeTitle, &item.RecipeImageURL); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (h Handler) queryPlanItem(r *http.Request, itemID int64, userID int64) (models.PlanItem, error) {
	var item models.PlanItem
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT mpi.id, mpi.recipe_id, mpi.meal_slot, mpi.note, r.title, COALESCE(r.image_urls->>0, '')
		FROM meal_plan_items mpi
		JOIN meal_plans mp ON mp.id = mpi.meal_plan_id
		JOIN recipes r ON r.id = mpi.recipe_id
		WHERE mpi.id = $1 AND mp.user_id = $2
	`, itemID, userID).Scan(&item.ID, &item.RecipeID, &item.MealSlot, &item.Note, &item.RecipeTitle, &item.RecipeImageURL)
	return item, err
}

func (h Handler) canReadRecipe(r *http.Request, recipeID int64, userID int64, isAdmin bool) (bool, error) {
	var ok bool
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT EXISTS(SELECT 1 FROM recipes WHERE id = $1 AND (is_public = TRUE OR owner_id = $2 OR $3))
	`, recipeID, userID, isAdmin).Scan(&ok)
	return ok, err
}
