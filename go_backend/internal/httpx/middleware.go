package httpx

import (
	"context"
	"database/sql"
	"net/http"
	"strings"

	"recipe-planner-go/internal/auth"
	"recipe-planner-go/internal/models"
)

type contextKey string

const userKey contextKey = "current_user"

func AuthMiddleware(db *sql.DB, secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok {
			Error(w, http.StatusUnauthorized, "Missing bearer token")
			return
		}
		userID, err := auth.ParseToken(token, secret)
		if err != nil {
			Error(w, http.StatusUnauthorized, "Invalid bearer token")
			return
		}
		user, err := LoadUser(r.Context(), db, userID)
		if err != nil {
			Error(w, http.StatusUnauthorized, "User not found")
			return
		}
		ctx := context.WithValue(r.Context(), userKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func CurrentUser(r *http.Request) models.User {
	user, _ := r.Context().Value(userKey).(models.User)
	return user
}

func LoadUser(ctx context.Context, db *sql.DB, id int64) (models.User, error) {
	var user models.User
	err := db.QueryRowContext(ctx, `
		SELECT id, openid, nickname, avatar_url, is_admin, created_at
		FROM users
		WHERE id = $1
	`, id).Scan(&user.ID, &user.OpenID, &user.Nickname, &user.AvatarURL, &user.IsAdmin, &user.CreatedAt)
	return user, err
}

func Method(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(next)
}
