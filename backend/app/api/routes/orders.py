from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.order import OrderCreate, OrderRead
from app.services.order_service import create_order, list_user_orders

router = APIRouter()


@router.post("", response_model=OrderRead)
def create_order_endpoint(
    payload: OrderCreate,
    db: Session = Depends(get_db),
) -> OrderRead:
    return create_order(db, payload)


@router.get("/user/{user_id}", response_model=list[OrderRead])
def list_orders_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
) -> list[OrderRead]:
    return list_user_orders(db, user_id)
