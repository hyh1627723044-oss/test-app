import app.models  # noqa: F401 - imports all SQLAlchemy model metadata
from app.db.session import Base, engine


def init_db() -> None:
    """Create tables for local development; production will use migrations."""
    Base.metadata.create_all(bind=engine)
