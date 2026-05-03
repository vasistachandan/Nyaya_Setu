"""Application configuration loaded from environment variables."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")


class Settings(BaseSettings):
    """Strongly typed settings; values can be overridden via env or .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://ccms_admin:ccms_secret@localhost:5432/ccms_ai",
    )
    pdf_storage_path: str = os.getenv("PDF_STORAGE_PATH", "./storage/pdfs")
    jwt_secret: str = os.getenv("JWT_SECRET", "ccms-hackathon-secret")
    jwt_expiry_minutes: int = int(os.getenv("JWT_EXPIRY_MINUTES", "720"))
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    # Max characters of PDF text we will send to Groq in a single request.
    # Groq's *free tier* enforces 6,000 tokens/minute on llama-3.3-70b. Sending
    # ~30k tokens of input drops the connection. 18,000 chars ≈ 4,500 tokens,
    # leaving headroom for the system prompt + JSON output. Bump this up on
    # paid tiers (developer tier allows 60,000 TPM).
    groq_max_input_chars: int = int(os.getenv("GROQ_MAX_INPUT_CHARS", "18000"))
    # Max tokens the model may emit in its JSON response. JSON action plans
    # almost never exceed 1.5k tokens; 2048 leaves comfortable headroom.
    groq_max_output_tokens: int = int(os.getenv("GROQ_MAX_OUTPUT_TOKENS", "2048"))

    @property
    def storage_dir(self) -> Path:
        path = Path(self.pdf_storage_path)
        if not path.is_absolute():
            path = BACKEND_DIR / path
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
