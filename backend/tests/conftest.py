import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["CORS_ORIGINS"] = (
    "http://localhost:5173,http://127.0.0.1:5173"
)

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)
