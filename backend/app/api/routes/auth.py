from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import DevLoginRequest, LoginResponse

router = APIRouter()


@router.post("/dev-login", response_model=LoginResponse)
def dev_login(payload: DevLoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.query(User).filter(User.openid == payload.openid).first()
    if user is None:
        user = User(
            openid=payload.openid,
            nickname=payload.nickname,
            avatar_url=payload.avatar_url,
        )
        db.add(user)
    else:
        user.nickname = payload.nickname
        user.avatar_url = payload.avatar_url

    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id))
    return LoginResponse(access_token=token, user=user)
