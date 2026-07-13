from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_

from app.api.deps import CurrentUser, DbSession
from app.models.recipe import Tag
from app.schemas.recipe import TagCreate, TagRead

router = APIRouter()


@router.get("", response_model=list[TagRead])
def list_tags(user: CurrentUser, db: DbSession) -> list[TagRead]:
    tags = db.query(Tag).filter(or_(Tag.owner_id.is_(None), Tag.owner_id == user.id)).order_by(Tag.name).all()
    return [TagRead(id=tag.id, name=tag.name, is_system=tag.owner_id is None) for tag in tags]


@router.post("", response_model=TagRead, status_code=status.HTTP_201_CREATED)
def create_tag(payload: TagCreate, user: CurrentUser, db: DbSession) -> TagRead:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag name is required")
    tag = Tag(name=name, owner_id=user.id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return TagRead(id=tag.id, name=tag.name, is_system=False)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, user: CurrentUser, db: DbSession) -> None:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    if tag.owner_id != user.id and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot delete this tag")
    db.delete(tag)
    db.commit()
