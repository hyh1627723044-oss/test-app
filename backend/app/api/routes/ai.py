from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.models.recipe import Recipe
from app.schemas.ai import (
    AiRecognizeRecipeRequest,
    AiRecognizeRecipeResponse,
    AiRecommendRequest,
    AiRecommendResponse,
)
from app.services.ai_service import recognize_recipe_image, recommend_today

router = APIRouter()


@router.post("/recommend-today", response_model=AiRecommendResponse)
def recommend_today_route(payload: AiRecommendRequest, user: CurrentUser, db: DbSession) -> AiRecommendResponse:
    recipes = db.query(Recipe).filter(Recipe.is_public.is_(True)).order_by(Recipe.created_at.desc()).limit(60).all()
    candidates = [
        {"id": recipe.id, "title": recipe.title, "description": recipe.description, "cook_time_minutes": recipe.cook_time_minutes}
        for recipe in recipes
    ]
    reply, recipe_ids = recommend_today(payload.message, candidates)
    valid_ids = {item["id"] for item in candidates}
    return AiRecommendResponse(reply=reply, recipe_ids=[recipe_id for recipe_id in recipe_ids if recipe_id in valid_ids])


@router.post("/recognize-recipe", response_model=AiRecognizeRecipeResponse)
def recognize_recipe(payload: AiRecognizeRecipeRequest, user: CurrentUser) -> AiRecognizeRecipeResponse:
    return AiRecognizeRecipeResponse(**recognize_recipe_image(str(payload.image_url)))
