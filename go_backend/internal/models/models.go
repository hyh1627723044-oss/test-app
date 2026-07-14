package models

import "time"

type User struct {
	ID        int64     `json:"id"`
	OpenID    string    `json:"openid"`
	Nickname  string    `json:"nickname"`
	AvatarURL string    `json:"avatar_url"`
	IsAdmin   bool      `json:"is_admin"`
	CreatedAt time.Time `json:"created_at"`
}

type Tag struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	IsSystem bool   `json:"is_system"`
}

type Recipe struct {
	ID              int64     `json:"id"`
	OwnerID         int64     `json:"owner_id"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	CookTimeMinutes int       `json:"cook_time_minutes"`
	Ingredients     []string  `json:"ingredients"`
	ImageURLs       []string  `json:"image_urls"`
	TagIDs          []int64   `json:"tag_ids"`
	Tags            []string  `json:"tags"`
	IsPublic        bool      `json:"is_public"`
	CanEdit         bool      `json:"can_edit"`
	CreatedAt       time.Time `json:"created_at"`
}

type Plan struct {
	ID       int64      `json:"id"`
	PlanDate string     `json:"plan_date"`
	Items    []PlanItem `json:"items"`
}

type PlanItem struct {
	ID             int64  `json:"id"`
	RecipeID       int64  `json:"recipe_id"`
	MealSlot       string `json:"meal_slot"`
	Note           string `json:"note"`
	RecipeTitle    string `json:"recipe_title"`
	RecipeImageURL string `json:"recipe_image_url"`
}
