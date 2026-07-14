package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"recipe-planner-go/internal/httpx"
	"recipe-planner-go/internal/models"
)

type tagCreateRequest struct {
	Name string `json:"name"`
}

func (h Handler) ListTags(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT id, name, owner_id IS NULL AS is_system
		FROM tags
		WHERE owner_id IS NULL OR owner_id = $1
		ORDER BY name
	`, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	tags := []models.Tag{}
	for rows.Next() {
		var tag models.Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.IsSystem); err != nil {
			httpx.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		tags = append(tags, tag)
	}
	httpx.JSON(w, http.StatusOK, tags)
}

func (h Handler) CreateTag(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	var payload tagCreateRequest
	if err := httpx.Decode(r, &payload); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	name := strings.TrimSpace(payload.Name)
	if name == "" || len([]rune(name)) > 32 {
		httpx.Error(w, http.StatusBadRequest, "Tag name must be 1-32 characters")
		return
	}

	var tag models.Tag
	err := h.DB.QueryRowContext(r.Context(), `
		INSERT INTO tags (name, owner_id)
		VALUES ($1, $2)
		RETURNING id, name, owner_id IS NULL AS is_system
	`, name, user.ID).Scan(&tag.ID, &tag.Name, &tag.IsSystem)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusCreated, tag)
}

func (h Handler) DeleteTag(w http.ResponseWriter, r *http.Request) {
	user := httpx.CurrentUser(r)
	tagID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid tag id")
		return
	}
	result, err := h.DB.ExecContext(r.Context(), `
		DELETE FROM tags
		WHERE id = $1 AND (owner_id = $2 OR $3)
	`, tagID, user.ID, user.IsAdmin)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if count, _ := result.RowsAffected(); count == 0 {
		httpx.Error(w, http.StatusNotFound, "Tag not found")
		return
	}
	httpx.NoContent(w)
}
