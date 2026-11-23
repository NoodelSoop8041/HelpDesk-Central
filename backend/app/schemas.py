from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
    field_validator,
)

from app.enums import AssetStatus, TicketPriority, TicketStatus


def normalize_email_address(value: object) -> object:
    if isinstance(value, str):
        return value.strip().lower()
    return value


def validate_password_length(value: SecretStr) -> SecretStr:
    password = value.get_secret_value()
    if not password.strip():
        raise ValueError("Password must not be blank.")
    if not 8 <= len(password) <= 128:
        raise ValueError("Password must be between 8 and 128 characters.")
    return value


class TicketCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    requester: str = Field(min_length=1, max_length=200)
    priority: TicketPriority = TicketPriority.MEDIUM

    @field_validator("title", "description", "requester")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field must not be blank.")
        return value


class TicketStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: TicketStatus


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    requester: str
    priority: TicketPriority
    status: TicketStatus
    created_at: datetime
    updated_at: datetime


class TicketStats(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int


class AssetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_tag: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    manufacturer: str | None = Field(default=None, max_length=200)
    model: str | None = Field(default=None, max_length=200)
    serial_number: str | None = Field(default=None, max_length=200)
    status: AssetStatus = AssetStatus.AVAILABLE
    assigned_employee: str | None = Field(default=None, max_length=200)

    @field_validator("asset_tag")
    @classmethod
    def normalize_asset_tag(cls, value: str) -> str:
        value = value.strip().upper()
        if not value:
            raise ValueError("Asset tag must not be blank.")
        return value

    @field_validator("name")
    @classmethod
    def normalize_asset_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Asset name must not be blank.")
        return value

    @field_validator(
        "category",
        "manufacturer",
        "model",
        "serial_number",
        "assigned_employee",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized_value = value.strip()
        return normalized_value or None


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_tag: str
    name: str
    category: str | None
    manufacturer: str | None
    model: str | None
    serial_number: str | None
    status: AssetStatus
    assigned_employee: str | None
    created_at: datetime


class UserRegistration(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: SecretStr

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Full name must not be blank.")
        return value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return normalize_email_address(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: SecretStr) -> SecretStr:
        return validate_password_length(value)


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: SecretStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return normalize_email_address(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: SecretStr) -> SecretStr:
        return validate_password_length(value)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
