from datetime import date

from pydantic import BaseModel, Field


class PlanItemCreate(BaseModel):
    recipe_id: int
    meal_slot: str = Field(min_length=1, max_length=24)
    note: str = ""


class PlanItemUpdate(BaseModel):
    meal_slot: str | None = Field(default=None, min_length=1, max_length=24)
    note: str | None = None


class PlanItemRead(BaseModel):
    id: int
    recipe_id: int
    meal_slot: str
    note: str
    recipe_title: str
    recipe_image_url: str


class PlanRead(BaseModel):
    id: int
    plan_date: date
    items: list[PlanItemRead]
