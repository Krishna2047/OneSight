import os
from typing import List, Optional
from pydantic_settings import BaseSettings

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DEFAULT_DB_PATH = os.path.join(_BASE_DIR, "onesight.db").replace("\\", "/")

class Settings(BaseSettings):
    PROJECT_NAME: str = "OneSight"
    PROJECT_DESCRIPTION: str = "Cloud Billing Alert System & Agentic AI FinOps Platform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = f"sqlite:///{_DEFAULT_DB_PATH}"
    
    # Cloud Simulation / Mock Mode
    MOCK_CLOUD_ENABLED: bool = True
    
    # Live Cloud Credentials (optional)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: str = "us-east-1"
    
    GCP_PROJECT_ID: Optional[str] = None
    GCP_CREDENTIALS_FILE: Optional[str] = None
    
    AZURE_SUBSCRIPTION_ID: Optional[str] = None
    AZURE_TENANT_ID: Optional[str] = None
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None
    
    # LLM API Keys (optional for Agentic AI - fallback to local FinOps reasoning engine if unset)
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Default Notification Webhooks (can also be configured via UI)
    DEFAULT_SLACK_WEBHOOK: Optional[str] = None
    DEFAULT_DISCORD_WEBHOOK: Optional[str] = None
    DEFAULT_GENERIC_WEBHOOK: Optional[str] = None
    DEFAULT_ALERT_EMAIL: Optional[str] = None
    
    # Anomaly Detection Defaults
    DEFAULT_Z_SCORE_THRESHOLD: float = 2.5
    DEFAULT_SPIKE_PERCENT_THRESHOLD: float = 35.0  # % jump above 7-day average

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
