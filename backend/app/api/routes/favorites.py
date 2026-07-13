from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.api.routes.recipes import to_recipe_read
from app.models.favorite import Favorite
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeRead

router = APIRouter()


@router.get("", response_model=list[RecipeRead])
def list_favorites(user: CurrentUser, db: DbSession) -> list[RecipeRead]:
    recipes = (
        db.query(Recipe)
        .join(Favorite, Favorite.recipe_id == Recipe.id)
        .options(selectinload(Recipe.tags))
        .filter(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )
    return [to_recipe_read(recipe, user.id, user.is_admin) for recipe in recipes]


@router.put("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_favorite(recipe_id: int, user: CurrentUser, db: DbSession) -> None:
    recipe = db.get(Recipe, recipe_id)
    if recipe is None or (not recipe.is_public and recipe.owner_id != user.id and not user.is_admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    if db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.recipe_id == recipe_id).first() is None:
        db.add(Favorite(user_id=user.id, recipe_id=recipe_id))
        db.commit()


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(recipe_id: int, user: CurrentUser, db: DbSession) -> None:
    favorite = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.recipe_id == recipe_id).first()
    if favorite is not None:
        db.delete(favorite)
        db.commit()
