from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from experimentlab.core.config import get_settings


def build_engine(url: str) -> Engine:
    options = {"check_same_thread": False} if url.startswith("sqlite") else {}
    engine = create_engine(url, connect_args=options, pool_pre_ping=True)
    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _record):
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


@lru_cache
def get_engine() -> Engine:
    return build_engine(get_settings().database_url)


def get_session() -> Generator[Session, None, None]:
    factory = sessionmaker(get_engine(), expire_on_commit=False)
    with factory() as session:
        yield session
