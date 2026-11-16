"""Core configuration settings for CronoGraph backend."""

from __future__ import annotations

import os
from pathlib import Path
from typing import List

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[3]
DEFAULT_DB_DIR = BASE_DIR / "DB"


class Settings(BaseSettings):
    """Application settings loaded from environment variables or defaults."""

    app_name: str = "CronoGraph API"
    app_version: str = "1.0.0"
    env: str = "development"
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins_raw: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        validation_alias=AliasChoices(
            "CRONOGRAPH_CORS_ORIGINS_RAW",
            "CRONOGRAPH_CORS_ORIGINS",
        ),
    )
    db_dir: Path = Path(os.getenv("CRONOGRAPH_DB_DIR", str(DEFAULT_DB_DIR)))

    model_config = SettingsConfigDict(env_prefix="CRONOGRAPH_", extra="ignore")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    @property
    def default_dataset_path(self) -> Path:
        return self.db_dir / "simulacion_academica.json"

    @property
    def generated_dir(self) -> Path:
        path = self.db_dir / "generated"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def results_dir(self) -> Path:
        path = self.db_dir / "results"
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
