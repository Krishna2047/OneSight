import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON, Text, Index
from app.core.database import Base
from app.models.billing import CloudProvider

class AnomalySeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AnomalyStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    INVESTIGATING = "INVESTIGATING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"

class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, default="tenant-acme", index=True)
    provider = Column(Enum(CloudProvider), nullable=False, default=CloudProvider.AWS, index=True)
    account_id = Column(String(64), nullable=False, default="112233445566", index=True)
    account_name = Column(String(128), nullable=False, default="Production Core")
    service_name = Column(String(128), nullable=False, index=True)
    usage_type = Column(String(128), nullable=True)
    region = Column(String(64), default="us-east-1")
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    anomaly_date = Column(String(10), nullable=False) # Date of spike (YYYY-MM-DD)
    current_cost = Column(Float, nullable=False)
    baseline_cost = Column(Float, nullable=False)
    cost_delta = Column(Float, nullable=False)
    deviation_percent = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    severity = Column(Enum(AnomalySeverity), default=AnomalySeverity.MEDIUM, index=True)
    status = Column(Enum(AnomalyStatus), default=AnomalyStatus.DETECTED, index=True)
    
    # Root Cause Analysis (produced by Agentic AI)
    root_cause_summary = Column(Text, nullable=True)
    suspect_resources = Column(JSON, nullable=True) # list of offending resource ARNs/IDs
    remediation_recommendations = Column(JSON, nullable=True) # list of actionable recommendations
    ai_confidence = Column(Float, nullable=True) # 0.0 to 1.0
    rca_generated_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_tenant_anomaly", "tenant_id", "anomaly_date"),
    )
