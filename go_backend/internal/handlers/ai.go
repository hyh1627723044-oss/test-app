package handlers

import (
	"net/http"

	"recipe-planner-go/internal/httpx"
	"recipe-planner-go/internal/service"
)

type aiRecommendRequest struct {
	Message string `json:"message"`
}

type aiRecognizeRequest struct {
	ImageURL string `json:"image_url"`
}

func (h Handler) RecommendToday(w http.ResponseWriter, r *http.Request) {
	var payload aiRecommendRequest
	if err := httpx.Decode(r, &payload); err != nil || payload.Message == "" {
		httpx.Error(w, http.StatusBadRequest, "message is required")
		return
	}
	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT id, title, description, cook_time_minutes
		FROM recipes
		WHERE is_public = TRUE
		ORDER BY created_at DESC
		LIMIT 60
	`)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	candidates := []map[string]any{}
	for rows.Next() {
		var id int64
		var title, description string
		var cookTime int
		if err := rows.Scan(&id, &title, &description, &cookTime); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		candidates = append(candidates, map[string]any{"id": id, "title": title, "description": description, "cook_time_minutes": cookTime})
	}
	client := service.NewAIClient(h.Config)
	reply, recipeIDs, err := client.RecommendToday(r.Context(), payload.Message, candidates)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"reply": reply, "recipe_ids": recipeIDs})
}

func (h Handler) RecognizeRecipe(w http.ResponseWriter, r *http.Request) {
	var payload aiRecognizeRequest
	if err := httpx.Decode(r, &payload); err != nil || payload.ImageURL == "" {
		httpx.Error(w, http.StatusBadRequest, "image_url is required")
		return
	}
	client := service.NewAIClient(h.Config)
	result, err := client.RecognizeRecipe(r.Context(), payload.ImageURL)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, result)
}
