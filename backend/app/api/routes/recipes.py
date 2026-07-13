from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.recipe import Recipe, Tag
from app.schemas.recipe import RecipePayload, RecipeRead

router = APIRouter()


def to_recipe_read(recipe: Recipe, viewer_id: int, is_admin: bool) -> RecipeRead:
    return RecipeRead(
        id=recipe.id,
        owner_id=recipe.owner_id,
        title=recipe.title,
        description=recipe.description,
        cook_time_minutes=recipe.cook_time_minutes,
        ingredients=recipe.ingredients or [],
        image_urls=recipe.image_urls or [],
        tag_ids=[tag.id for tag in recipe.tags],
        tags=[tag.name for tag in recipe.tags],
        is_public=recipe.is_public,
        can_edit=is_admin or recipe.owner_id == viewer_id,
        created_at=recipe.created_at,
    )


def get_recipe_or_404(recipe_id: int, db: DbSession) -> Recipe:
    recipe = db.query(Recipe).options(selectinload(Recipe.tags)).filter(Recipe.id == recipe_id).first()
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return recipe


def assert_can_write(recipe: Recipe, user: CurrentUser) -> None:
    if recipe.owner_id != user.id and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot edit this recipe")


@router.get("", response_model=list[RecipeRead])
def list_recipes(
    user: CurrentUser,
    db: DbSession,
    keyword: str = "",
    tag_id: int | None = None,
    mine: bool = False,
) -> list[RecipeRead]:
    query = db.query(Recipe).options(selectinload(Recipe.tags))
    if mine:
        query = query.filter(Recipe.owner_id == user.id)
    elif not user.is_admin:
        query = query.filter(or_(Recipe.is_public.is_(True), Recipe.owner_id == user.id))
    if keyword.strip():
        query = query.filter(Recipe.title.ilike(f"%{keyword.strip()}%"))
    if tag_id is not None:
        query = query.filter(Recipe.tags.any(Tag.id == tag_id))
    recipes = query.order_by(Recipe.created_at.desc()).all()
    return [to_recipe_read(recipe, user.id, user.is_admin) for recipe in recipes]


@router.post("", response_model=RecipeRead, status_code=status.HTTP_201_CREATED)
def create_recipe(payload: RecipePayload, user: CurrentUser, db: DbSession) -> RecipeRead:
    tags = db.query(Tag).filter(Tag.id.in_(payload.tag_ids)).all() if payload.tag_ids else []
    if len(tags) != len(set(payload.tag_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more tags do not exist")
    if any(tag.owner_id not in (None, user.id) for tag in tags):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot use another user's tag")
    recipe = Recipe(owner_id=user.id, **payload.model_dump(exclude={"tag_ids"}))
    recipe.tags = tags
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return to_recipe_read(recipe, user.id, user.is_admin)


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(recipe_id: int, user: CurrentUser, db: DbSession) -> RecipeRead:
    recipe = get_recipe_or_404(recipe_id, db)
    if not recipe.is_public and recipe.owner_id != user.id and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This recipe is private")
    return to_recipe_read(recipe, user.id, user.is_admin)


@router.patch("/{recipe_id}", response_model=RecipeRead)
def update_recipe(recipe_id: int, payload: RecipePayload, user: CurrentUser, db: DbSession) -> RecipeRead:
    recipe = get_recipe_or_404(recipe_id, db)
    assert_can_write(recipe, user)
    tags = db.query(Tag).filter(Tag.id.in_(payload.tag_ids)).all() if payload.tag_ids else []
    if len(tags) != len(set(payload.tag_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more tags do not exist")
    if any(tag.owner_id not in (None, recipe.owner_id) for tag in tags):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot use another user's tag")
    for key, value in payload.model_dump(exclude={"tag_ids"}).items():
        setattr(recipe, key, value)
    recipe.tags = tags
    db.commit()
    db.refresh(recipe)
    return to_recipe_read(recipe, user.id, user.is_admin)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, user: CurrentUser, db: DbSession) -> None:
    recipe = get_recipe_or_404(recipe_id, db)
    assert_can_write(recipe, user)
    db.delete(recipe)
    db.commit()
