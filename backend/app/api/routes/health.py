from fastapi import APIRouter

from app.schemas.common import MessageResponse

router = APIRouter()


@router.get("/health", response_model=MessageResponse)
def health_check() -> MessageResponse:
    return MessageResponse(message="ok")
