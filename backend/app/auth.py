from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserRead, UserRegistration
from app.security import hash_password

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    payload: UserRegistration,
    db: Session = Depends(get_db),
) -> User:
    existing_user_id = db.scalar(
        select(User.id).where(User.email == str(payload.email))
    )
    if existing_user_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        full_name=payload.full_name,
        email=str(payload.email),
        hashed_password=hash_password(payload.password.get_secret_value()),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        duplicate_user_id = db.scalar(
            select(User.id).where(User.email == str(payload.email))
        )
        if duplicate_user_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            ) from None
        raise

    db.refresh(user)
    return user
