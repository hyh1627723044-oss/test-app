from fastapi import APIRouter

from app.api.routes import ai, auth, favorites, health, plans, recipes, tags

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(recipes.router, prefix="/recipes", tags=["recipes"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(favorites.router, prefix="/favorites", tags=["favorites"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
