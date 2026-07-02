from sqlalchemy.orm import Session

from app.db.session import Base, SessionLocal, engine
from app.models import Category, Product


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()


def seed_demo_data(db: Session) -> None:
    has_product = db.query(Product).first()
    if has_product:
        return

    drinks = Category(name="饮品", sort_order=1)
    snacks = Category(name="小食", sort_order=2)
    db.add_all([drinks, snacks])
    db.flush()

    db.add_all(
        [
            Product(
                category_id=drinks.id,
                name="招牌拿铁",
                description="适合先跑通点单流程的示例商品",
                price_cents=1800,
                image_url="",
                sort_order=1,
            ),
            Product(
                category_id=drinks.id,
                name="桃子气泡水",
                description="清爽甜口示例商品",
                price_cents=1600,
                image_url="",
                sort_order=2,
            ),
            Product(
                category_id=snacks.id,
                name="黄油可颂",
                description="搭配饮品的示例小食",
                price_cents=1200,
                image_url="",
                sort_order=3,
            ),
        ]
    )
    db.commit()
