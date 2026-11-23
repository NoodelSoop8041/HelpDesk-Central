import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import TokenResponse, UserLogin, UserRead, UserRegistration
from app.security import (
    DUMMY_PASSWORD_HASH,
    JWTConfigurationError,
    create_access_token,
    decode_access_token,
    get_jwt_settings,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
bearer_scheme = HTTPBearer(auto_error=False)
INVALID_CREDENTIALS = "Invalid email or password."
INVALID_TOKEN = "Could not validate credentials."


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


@router.post("/login", response_model=TokenResponse)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
) -> TokenResponse:
    try:
        jwt_settings = get_jwt_settings()
    except JWTConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        ) from exc

    user = db.scalar(select(User).where(User.email == str(payload.email)))
    stored_password_hash = (
        user.hashed_password if user is not None else DUMMY_PASSWORD_HASH
    )
    password_matches = verify_password(
        payload.password.get_secret_value(),
        stored_password_hash,
    )
    if user is None or not password_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=create_access_token(user.id, jwt_settings),
        expires_in=jwt_settings.access_token_expire_minutes * 60,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_TOKEN,
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        jwt_settings = get_jwt_settings()
    except JWTConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        ) from exc

    try:
        user_id = decode_access_token(credentials.credentials, jwt_settings)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_TOKEN,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_TOKEN,
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
