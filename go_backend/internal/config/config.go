package config

import "os"

type Config struct {
	Env             string
	HTTPAddr        string
	DatabaseURL     string
	JWTSecret       string
	MaasAPIKey      string
	MaasBaseURL     string
	MaasTextModel   string
	MaasVisionModel string
}

func Load() Config {
	return Config{
		Env:             getenv("APP_ENV", "development"),
		HTTPAddr:        getenv("HTTP_ADDR", ":8080"),
		DatabaseURL:     getenv("DATABASE_URL", "postgres://recipe:recipe@localhost:5432/recipe_planner?sslmode=disable"),
		JWTSecret:       getenv("JWT_SECRET", "change-me-in-production"),
		MaasAPIKey:      os.Getenv("TENCENT_MAAS_API_KEY"),
		MaasBaseURL:     getenv("TENCENT_MAAS_BASE_URL", "https://tokenhub.tencentmaas.com/v1"),
		MaasTextModel:   getenv("TENCENT_MAAS_TEXT_MODEL", "hy3"),
		MaasVisionModel: getenv("TENCENT_MAAS_VISION_MODEL", "hy-vision-2.0-instruct"),
	}
}

func getenv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
