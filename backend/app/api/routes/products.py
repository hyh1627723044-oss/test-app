from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.product import ProductListResponse

router = APIRouter()


@router.get("", response_model=ProductListResponse)
def list_products(db: Session = Depends(get_db)) -> ProductListResponse:
    categories = (
        db.query(Category)
        .filter(Category.is_active.is_(True))
        .order_by(Category.sort_order.asc(), Category.id.asc())
        .all()
    )
    products = (
        db.query(Product)
        .filter(Product.is_active.is_(True))
        .order_by(Product.sort_order.asc(), Product.id.asc())
        .all()
    )
    return ProductListResponse(categories=categories, products=products)
