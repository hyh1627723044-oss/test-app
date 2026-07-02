from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    id: int
    openid: str
    nickname: str
    avatar_url: str

    model_config = ConfigDict(from_attributes=True)


class DevLoginRequest(BaseModel):
    openid: str = "dev-openid"
    nickname: str = "体验用户"
    avatar_url: str = ""


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
