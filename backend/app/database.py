import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL must be set before starting the API.")

engine_options: dict[str, object] = {"pool_pre_ping": True}
if database_url.startswith("sqlite"):
    engine_options.update(
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

engine = create_engine(database_url, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session
