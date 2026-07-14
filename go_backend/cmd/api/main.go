package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"recipe-planner-go/internal/config"
	"recipe-planner-go/internal/db"
	"recipe-planner-go/internal/handlers"
	"recipe-planner-go/internal/httpx"
)

func main() {
	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	conn, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer conn.Close()

	if err := db.Migrate(ctx, conn); err != nil {
		log.Fatalf("migrate database: %v", err)
	}

	h := handlers.Handler{DB: conn, Config: cfg}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", h.Health)
	mux.HandleFunc("POST /api/auth/dev-login", h.DevLogin)

	protected := http.NewServeMux()
	protected.HandleFunc("GET /api/recipes", h.ListRecipes)
	protected.HandleFunc("POST /api/recipes", h.CreateRecipe)
	protected.HandleFunc("GET /api/recipes/{id}", h.GetRecipe)
	protected.HandleFunc("PATCH /api/recipes/{id}", h.UpdateRecipe)
	protected.HandleFunc("DELETE /api/recipes/{id}", h.DeleteRecipe)
	protected.HandleFunc("GET /api/tags", h.ListTags)
	protected.HandleFunc("POST /api/tags", h.CreateTag)
	protected.HandleFunc("DELETE /api/tags/{id}", h.DeleteTag)
	protected.HandleFunc("GET /api/plans", h.GetPlan)
	protected.HandleFunc("POST /api/plans/{date}/items", h.AddPlanItem)
	protected.HandleFunc("PATCH /api/plans/items/{id}", h.UpdatePlanItem)
	protected.HandleFunc("DELETE /api/plans/items/{id}", h.DeletePlanItem)
	protected.HandleFunc("GET /api/favorites", h.ListFavorites)
	protected.HandleFunc("PUT /api/favorites/{id}", h.AddFavorite)
	protected.HandleFunc("DELETE /api/favorites/{id}", h.DeleteFavorite)
	protected.HandleFunc("POST /api/ai/recommend-today", h.RecommendToday)
	protected.HandleFunc("POST /api/ai/recognize-recipe", h.RecognizeRecipe)
	mux.Handle("/api/", httpx.AuthMiddleware(conn, cfg.JWTSecret, protected))

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           httpx.CORS(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("Go recipe backend listening on %s", cfg.HTTPAddr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
