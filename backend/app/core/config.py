from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Recipe Meal Planner API"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://recipe:recipe@localhost:5432/recipe_planner"
    jwt_secret: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24 * 30
    backend_cors_origins: str = Field(default="*", alias="BACKEND_CORS_ORIGINS")
    tencent_maas_api_key: str = ""
    tencent_maas_base_url: str = "https://tokenhub.tencentmaas.com/v1"
    tencent_maas_text_model: str = "hy3"
    tencent_maas_vision_model: str = "hy-vision-2.0-instruct"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        populate_by_name=True,
    )

    @property
    def cors_origins(self) -> list[str]:
        if self.backend_cors_origins.strip() == "*":
            return ["*"]
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
