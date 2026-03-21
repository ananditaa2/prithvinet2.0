from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "citizen"  # admin | regional_officer | monitoring_team | industry_user | citizen


class UserUpdate(BaseModel):
    name: Optional[str] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
