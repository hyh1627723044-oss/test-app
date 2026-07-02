from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)


class OrderCreate(BaseModel):
    user_id: int
    items: list[OrderItemCreate]
    remark: str = ""


class OrderItemRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    unit_price_cents: int
    quantity: int
    subtotal_cents: int

    model_config = ConfigDict(from_attributes=True)


class OrderRead(BaseModel):
    id: int
    order_no: str
    user_id: int
    status: OrderStatus
    total_cents: int
    remark: str
    created_at: datetime
    items: list[OrderItemRead]

    model_config = ConfigDict(from_attributes=True)
