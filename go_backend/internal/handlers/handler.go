package handlers

import (
	"database/sql"

	"recipe-planner-go/internal/config"
)

type Handler struct {
	DB     *sql.DB
	Config config.Config
}
