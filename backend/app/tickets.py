from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import TicketStatus
from app.models import Ticket
from app.schemas import TicketCreate, TicketRead, TicketStats, TicketStatusUpdate

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("/stats", response_model=TicketStats)
def get_ticket_stats(db: Session = Depends(get_db)) -> TicketStats:
    grouped_counts = db.execute(
        select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)
    ).all()
    counts = {ticket_status: count for ticket_status, count in grouped_counts}

    return TicketStats(
        total_tickets=sum(counts.values()),
        open_tickets=counts.get(TicketStatus.OPEN, 0),
        in_progress_tickets=counts.get(TicketStatus.IN_PROGRESS, 0),
        resolved_tickets=counts.get(TicketStatus.RESOLVED, 0),
    )


@router.get("", response_model=list[TicketRead])
def list_tickets(db: Session = Depends(get_db)) -> list[Ticket]:
    return list(
        db.scalars(
            select(Ticket).order_by(Ticket.created_at.desc(), Ticket.id.desc())
        )
    )


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)) -> Ticket:
    ticket = Ticket(**payload.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found.",
        )
    return ticket


@router.patch("/{ticket_id}/status", response_model=TicketRead)
def update_ticket_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found.",
        )

    ticket.status = payload.status
    db.commit()
    db.refresh(ticket)
    return ticket
