from pydantic import AnyHttpUrl, BaseModel, Field


class AiRecommendRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class AiRecommendResponse(BaseModel):
    reply: str
    recipe_ids: list[int] = Field(default_factory=list)


class AiRecognizeRecipeRequest(BaseModel):
    image_url: AnyHttpUrl


class AiRecognizeRecipeResponse(BaseModel):
    title: str = ""
    description: str = ""
    ingredients: list[str] = Field(default_factory=list)
    suggested_tags: list[str] = Field(default_factory=list)
    cook_time_minutes: int = 0
    raw_reply: str
