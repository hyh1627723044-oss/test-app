from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.plan import MealPlan, MealPlanItem
from app.models.recipe import Recipe
from app.schemas.plan import PlanItemCreate, PlanItemRead, PlanItemUpdate, PlanRead

router = APIRouter()


def to_item_read(item: MealPlanItem) -> PlanItemRead:
    return PlanItemRead(
        id=item.id,
        recipe_id=item.recipe_id,
        meal_slot=item.meal_slot,
        note=item.note,
        recipe_title=item.recipe.title,
        recipe_image_url=(item.recipe.image_urls or [""])[0],
    )


def get_plan_for_user(plan_date: date, user_id: int, db: DbSession, create: bool = False) -> MealPlan | None:
    plan = (
        db.query(MealPlan)
        .options(selectinload(MealPlan.items).selectinload(MealPlanItem.recipe))
        .filter(MealPlan.user_id == user_id, MealPlan.plan_date == plan_date)
        .first()
    )
    if plan is None and create:
        plan = MealPlan(user_id=user_id, plan_date=plan_date)
        db.add(plan)
        db.commit()
        db.refresh(plan)
    return plan


@router.get("", response_model=PlanRead)
def get_plan(
    user: CurrentUser,
    db: DbSession,
    plan_date: date = Query(alias="date"),
) -> PlanRead:
    plan = get_plan_for_user(plan_date, user.id, db, create=True)
    return PlanRead(id=plan.id, plan_date=plan.plan_date, items=[to_item_read(item) for item in plan.items])


@router.post("/{plan_date}/items", response_model=PlanItemRead, status_code=status.HTTP_201_CREATED)
def add_plan_item(plan_date: date, payload: PlanItemCreate, user: CurrentUser, db: DbSession) -> PlanItemRead:
    recipe = db.get(Recipe, payload.recipe_id)
    if recipe is None or (not recipe.is_public and recipe.owner_id != user.id and not user.is_admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    plan = get_plan_for_user(plan_date, user.id, db, create=True)
    item = MealPlanItem(meal_plan_id=plan.id, recipe_id=recipe.id, meal_slot=payload.meal_slot, note=payload.note)
    db.add(item)
    db.commit()
    db.refresh(item)
    return to_item_read(item)


def get_item_for_user(item_id: int, user_id: int, db: DbSession) -> MealPlanItem:
    item = (
        db.query(MealPlanItem)
        .join(MealPlan)
        .options(selectinload(MealPlanItem.recipe))
        .filter(MealPlanItem.id == item_id, MealPlan.user_id == user_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan item not found")
    return item


@router.patch("/items/{item_id}", response_model=PlanItemRead)
def update_plan_item(item_id: int, payload: PlanItemUpdate, user: CurrentUser, db: DbSession) -> PlanItemRead:
    item = get_item_for_user(item_id, user.id, db)
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return to_item_read(item)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan_item(item_id: int, user: CurrentUser, db: DbSession) -> None:
    item = get_item_for_user(item_id, user.id, db)
    db.delete(item)
    db.commit()
