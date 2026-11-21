import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON, Boolean, Text, Index
from app.core.database import Base

class AlertMetricType(str, enum.Enum):
    DAILY_SPEND_SPIKE = "DAILY_SPEND_SPIKE"       # % jump above rolling average
    MONTHLY_BUDGET_LIMIT = "MONTHLY_BUDGET_LIMIT" # Absolute $ limit
    SERVICE_BUDGET = "SERVICE_BUDGET"             # Specific service threshold ($)
    ACCOUNT_BUDGET = "ACCOUNT_BUDGET"             # Specific AWS linked account threshold ($)
    ANOMALY_DETECTED = "ANOMALY_DETECTED"         # Triggers on any detected anomaly
    IDLE_WASTE_THRESHOLD = "IDLE_WASTE_THRESHOLD" # Total idle resource waste exceeds $

class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    WARNING = "WARNING"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AlertChannelType(str, enum.Enum):
    SLACK = "SLACK"
    DISCORD = "DISCORD"
    WEBHOOK = "WEBHOOK"
    EMAIL = "EMAIL"

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, default="tenant-acme", index=True)
    name = Column(String(128), nullable=False)
    description = Column(String(256), nullable=True)
    provider = Column(String(32), default="AWS") # "AWS", "ALL", etc.
    account_filter = Column(String(64), nullable=True) # Linked AWS account ID or null
    metric_type = Column(Enum(AlertMetricType), nullable=False)
    threshold_value = Column(Float, nullable=False) # e.g. 35.0 (for 35%), 5000.0 (for $5k)
    service_filter = Column(String(128), nullable=True) # e.g. "Amazon Bedrock (GenAI)"
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.WARNING)
    channels = Column(JSON, default=list) # e.g. ["SLACK", "DISCORD", "WEBHOOK"]
    webhook_url = Column(String(512), nullable=True) # Channel-specific or override URL
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, default="tenant-acme", index=True)
    rule_id = Column(Integer, nullable=True)
    rule_name = Column(String(128), nullable=False)
    channel = Column(String(32), nullable=False) # SLACK, DISCORD, WEBHOOK, EMAIL
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.WARNING)
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(32), default="SENT") # SENT, FAILED, SIMULATED
    response_payload = Column(JSON, nullable=True)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
