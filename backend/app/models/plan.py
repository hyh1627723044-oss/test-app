from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class MealPlan(Base):
    __tablename__ = "meal_plans"
    __table_args__ = (UniqueConstraint("user_id", "plan_date", name="uq_user_plan_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    plan_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    items = relationship("MealPlanItem", cascade="all, delete-orphan", lazy="selectin")


class MealPlanItem(Base):
    __tablename__ = "meal_plan_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meal_plan_id: Mapped[int] = mapped_column(ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"), nullable=False, index=True)
    meal_slot: Mapped[str] = mapped_column(String(24), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recipe = relationship("Recipe", lazy="selectin")
