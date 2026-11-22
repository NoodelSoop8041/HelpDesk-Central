from datetime import datetime, timezone
from enum import Enum as PythonEnum

from sqlalchemy import CheckConstraint, DateTime, Enum as SQLAlchemyEnum
from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enums import TicketPriority, TicketStatus


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
