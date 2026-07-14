package handlers

import (
	"net/http"
	"time"

	"recipe-planner-go/internal/auth"
	"recipe-planner-go/internal/httpx"
	"recipe-planner-go/internal/models"
)

type devLoginRequest struct {
	OpenID    string `json:"openid"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
}

func (h Handler) DevLogin(w http.ResponseWriter, r *http.Request) {
	var payload devLoginRequest
	if err := httpx.Decode(r, &payload); err != nil || payload.OpenID == "" {
		httpx.Error(w, http.StatusBadRequest, "openid is required")
		return
	}

	var user models.User
	err := h.DB.QueryRowContext(r.Context(), `
		INSERT INTO users (openid, nickname, avatar_url)
		VALUES ($1, $2, $3)
		ON CONFLICT (openid) DO UPDATE
		SET nickname = EXCLUDED.nickname, avatar_url = EXCLUDED.avatar_url
		RETURNING id, openid, nickname, avatar_url, is_admin, created_at
	`, payload.OpenID, payload.Nickname, payload.AvatarURL).
		Scan(&user.ID, &user.OpenID, &user.Nickname, &user.AvatarURL, &user.IsAdmin, &user.CreatedAt)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	token, err := auth.CreateToken(user.ID, h.Config.JWTSecret, 30*24*time.Hour)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"access_token": token, "token_type": "bearer", "user": user})
}
