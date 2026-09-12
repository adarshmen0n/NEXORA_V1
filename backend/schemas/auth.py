from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
import datetime

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=3, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=25)
    password: str = Field(..., min_length=6, max_length=100)
    confirm_password: Optional[str] = None
    role: Optional[str] = "PASSENGER"

    @field_validator("email")
    def validate_email_format(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address format")
        return v.lower().strip()

    @field_validator("confirm_password")
    def passwords_match(cls, v, values):
        if v is not None and "password" in values.data and v != values.data["password"]:
            raise ValueError("Passwords do not match")
        return v

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    id: int
    user_code: str
    name: str
    email: str
    role: str
    user: Optional[Dict[str, Any]] = None

class UserResponse(BaseModel):
    id: int
    user_code: str
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    last_login: Optional[datetime.datetime] = None
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True
