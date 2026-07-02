from pydantic import BaseModel, ConfigDict


class CategoryRead(BaseModel):
    id: int
    name: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class ProductRead(BaseModel):
    id: int
    category_id: int
    name: str
    description: str
    price_cents: int
    image_url: str
    stock: int
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    categories: list[CategoryRead]
    products: list[ProductRead]
