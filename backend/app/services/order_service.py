from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderCreate


def create_order(db: Session, payload: OrderCreate) -> Order:
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    product_ids = [item.product_id for item in payload.items]
    if not product_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order items cannot be empty",
        )

    products = (
        db.query(Product)
        .filter(Product.id.in_(product_ids), Product.is_active.is_(True))
        .all()
    )
    product_map = {product.id: product for product in products}

    order_items: list[OrderItem] = []
    total_cents = 0
    for item in payload.items:
        product = product_map.get(item.product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {product.name} is out of stock",
            )

        subtotal = product.price_cents * item.quantity
        total_cents += subtotal
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                unit_price_cents=product.price_cents,
                quantity=item.quantity,
                subtotal_cents=subtotal,
            )
        )

    order = Order(
        order_no=build_order_no(),
        user_id=user.id,
        total_cents=total_cents,
        remark=payload.remark,
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return get_order(db, order.id)


def list_user_orders(db: Session, user_id: int) -> list[Order]:
    return (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .all()
    )


def get_order(db: Session, order_id: int) -> Order:
    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    return order


def build_order_no() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S%f")
