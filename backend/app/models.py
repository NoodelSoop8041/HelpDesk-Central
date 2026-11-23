from datetime import datetime, timezone
from enum import Enum as PythonEnum

from sqlalchemy import CheckConstraint, DateTime, Enum as SQLAlchemyEnum
from sqlalchemy import String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import AssetStatus, TicketPriority, TicketStatus


def enum_values(enum_type: type[PythonEnum]) -> list[str]:
    return [member.value for member in enum_type]


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint("length(trim(title)) > 0", name="ck_tickets_title_nonempty"),
        CheckConstraint(
            "length(trim(description)) > 0",
            name="ck_tickets_description_nonempty",
        ),
        CheckConstraint(
            "length(trim(requester)) > 0",
            name="ck_tickets_requester_nonempty",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requester: Mapped[str] = mapped_column(String(200), nullable=False)
    priority: Mapped[TicketPriority] = mapped_column(
        SQLAlchemyEnum(
            TicketPriority,
            name="ticket_priority",
            native_enum=False,
            create_constraint=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=TicketPriority.MEDIUM,
        server_default=TicketPriority.MEDIUM.value,
    )
    status: Mapped[TicketStatus] = mapped_column(
        SQLAlchemyEnum(
            TicketStatus,
            name="ticket_status",
            native_enum=False,
            create_constraint=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=TicketStatus.OPEN,
        server_default=TicketStatus.OPEN.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=func.now(),
    )


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        CheckConstraint(
            "length(trim(full_name)) > 0",
            name="ck_users_full_name_nonempty",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="employee",
        server_default="employee",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (
        UniqueConstraint("asset_tag", name="uq_assets_asset_tag"),
        CheckConstraint(
            "length(trim(asset_tag)) > 0",
            name="ck_assets_asset_tag_nonempty",
        ),
        CheckConstraint(
            "length(trim(name)) > 0",
            name="ck_assets_name_nonempty",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_tag: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))
    manufacturer: Mapped[str | None] = mapped_column(String(200))
    model: Mapped[str | None] = mapped_column(String(200))
    serial_number: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[AssetStatus] = mapped_column(
        SQLAlchemyEnum(
            AssetStatus,
            name="asset_status",
            native_enum=False,
            create_constraint=True,
            values_callable=enum_values,
        ),
        nullable=False,
        default=AssetStatus.AVAILABLE,
        server_default=AssetStatus.AVAILABLE.value,
    )
    assigned_employee: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
