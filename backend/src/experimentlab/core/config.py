from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="EXPERIMENTLAB_", env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./experimentlab.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    dataset_storage_path: Path = Path("./storage/datasets")
    max_csv_bytes: int = Field(default=10 * 1024 * 1024, ge=1)
    max_csv_rows: int = Field(default=100_000, ge=1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
