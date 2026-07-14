package handlers

import (
	"net/http"

	"recipe-planner-go/internal/httpx"
)

func (h Handler) Health(w http.ResponseWriter, r *http.Request) {
	if err := h.DB.PingContext(r.Context()); err != nil {
		httpx.Error(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
