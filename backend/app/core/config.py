import os
from typing import List, Optional
from pydantic_settings import BaseSettings

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_CANONICAL_DB_PATH = os.path.join(_BACKEND_DIR, "onesight.db").replace("\\", "/")

class Settings(BaseSettings):
    PROJECT_NAME: str = "OneSight"
    PROJECT_DESCRIPTION: str = "Cloud Billing Alert System & Agentic AI FinOps Platform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = f"sqlite:///{_CANONICAL_DB_PATH}"

    @property
    def get_database_url(self) -> str:
        """
        Safely resolves the database URL. If a relative SQLite path is given and not found
        from the current working directory, automatically fallback to the canonical absolute path.
        """
        url = self.DATABASE_URL
        if url and url.startswith("sqlite"):
            raw_path = url.replace("sqlite:///", "").replace("sqlite://", "")
            if not os.path.isabs(raw_path) and not os.path.exists(raw_path):
                return f"sqlite:///{_CANONICAL_DB_PATH}"
        return url or f"sqlite:///{_CANONICAL_DB_PATH}"
    
    # Security & Encryption (Fernet AES-256 for Credentials At Rest)
    ENCRYPTION_KEY: str = "onesight-finops-secure-master-encryption-key-2026"
    
    # Cloud Simulation / Mock Mode
    MOCK_CLOUD_ENABLED: bool = False
    
    # Live Cloud Credentials (optional)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: str = "us-east-1"
    ONESIGHT_AWS_ACCOUNT_ID: Optional[str] = None  # SaaS master account that assumes customer cross-account roles
    
    GCP_PROJECT_ID: Optional[str] = None
    GCP_CREDENTIALS_FILE: Optional[str] = None
    
    AZURE_SUBSCRIPTION_ID: Optional[str] = None
    AZURE_TENANT_ID: Optional[str] = None
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None
    
    # LLM API Keys & Open-Source Providers (Groq, Ollama, Gemini, OpenAI, Claude)
    ACTIVE_LLM_PROVIDER: str = "ollama"  # "ollama" | "groq" | "openai" | "gemini" | "auto"
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"  # Default local Ollama endpoint
    OLLAMA_MODEL: str = "llama3.1"
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    ANTHROPIC_API_KEY: Optional[str] = None
    LLM_MODEL: str = "llama3.1"  # active model name
    
    # Default Notification Webhooks (can also be configured via UI)
    DEFAULT_SLACK_WEBHOOK: Optional[str] = None
    DEFAULT_TEAMS_WEBHOOK: Optional[str] = None
    DEFAULT_DISCORD_WEBHOOK: Optional[str] = None
    DEFAULT_GENERIC_WEBHOOK: Optional[str] = None
    DEFAULT_ALERT_EMAIL: Optional[str] = None
    
    # Anomaly Detection Defaults
    DEFAULT_Z_SCORE_THRESHOLD: float = 2.5
    DEFAULT_SPIKE_PERCENT_THRESHOLD: float = 35.0  # % jump above 7-day average

    class Config:
        env_file = (".env", "backend/.env", os.path.join(_BACKEND_DIR, ".env"), os.path.join(os.path.dirname(_BACKEND_DIR), ".env"))
        case_sensitive = True
        extra = "ignore"

settings = Settings()
