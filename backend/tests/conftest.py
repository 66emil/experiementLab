from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from experimentlab.core.config import Settings, get_settings
from experimentlab.db.base import Base
from experimentlab.db.session import build_engine, get_session
from experimentlab.main import create_app


@pytest.fixture
def settings(tmp_path):
    return Settings(dataset_storage_path=tmp_path / "datasets")


@pytest.fixture
def client(tmp_path, settings) -> Generator[TestClient, None, None]:
    engine = build_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)

    def session_override():
        with Session(engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app) as test_client:
        yield test_client
    engine.dispose()
