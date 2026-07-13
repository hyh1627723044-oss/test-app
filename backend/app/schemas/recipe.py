from datetime import datetime

from pydantic import BaseModel, Field


class RecipePayload(BaseModel):
    title: str = Field(min_length=1, max_length=128)
    description: str = ""
    cook_time_minutes: int = Field(default=0, ge=0, le=1440)
    ingredients: list[str] = Field(default_factory=list)
    image_urls: list[str] = Field(default_factory=list, max_length=9)
    tag_ids: list[int] = Field(default_factory=list, max_length=12)
    is_public: bool = True


class RecipeRead(BaseModel):
    id: int
    owner_id: int
    title: str
    description: str
    cook_time_minutes: int
    ingredients: list[str]
    image_urls: list[str]
    tag_ids: list[int]
    tags: list[str]
    is_public: bool
    can_edit: bool
    created_at: datetime


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=32)


class TagRead(BaseModel):
    id: int
    name: str
    is_system: bool
