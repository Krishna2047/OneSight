import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON, Index
from app.core.database import Base

class CloudProvider(str, enum.Enum):
    AWS = "AWS"
    GCP = "GCP"
    AZURE = "AZURE"

class BillingRecord(Base):
    __tablename__ = "billing_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, default="tenant-acme", index=True)
    provider = Column(Enum(CloudProvider), nullable=False, default=CloudProvider.AWS, index=True)
    account_id = Column(String(64), nullable=False, index=True)
    account_name = Column(String(128), nullable=False, default="Production")
    service_name = Column(String(128), nullable=False, index=True)
    region = Column(String(64), nullable=False, default="us-east-1", index=True)
    usage_type = Column(String(128), nullable=True, index=True) # e.g. "USE1-BoxUsage:c5.2xlarge", "NatGateway-Bytes"
    charge_type = Column(String(64), default="Usage", index=True) # Usage, Tax, SavingsPlanCoveredUsage
    cost = Column(Float, nullable=False)
    currency = Column(String(10), default="USD")
    usage_amount = Column(Float, default=0.0)
    usage_unit = Column(String(32), default="Units")
    record_date = Column(String(10), nullable=False, index=True) # YYYY-MM-DD
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    resource_id = Column(String(256), nullable=True)
    tags = Column(JSON, nullable=True) # e.g. {"Environment": "Production", "Team": "AI-Infra"}

    __table_args__ = (
        Index("idx_tenant_date", "tenant_id", "record_date"),
        Index("idx_tenant_service", "tenant_id", "service_name"),
        Index("idx_tenant_account", "tenant_id", "account_id"),
        Index("idx_tenant_region", "tenant_id", "region"),
    )

class IdleResource(Base):
    __tablename__ = "idle_resources"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, default="tenant-acme", index=True)
    provider = Column(Enum(CloudProvider), nullable=False, default=CloudProvider.AWS)
    account_id = Column(String(64), nullable=False)
    account_name = Column(String(128), nullable=False, default="Cloud Account")
    resource_id = Column(String(256), nullable=False, unique=True)
    resource_type = Column(String(128), nullable=False) # "Unattached EBS Volume", "Idle NAT Gateway", "Unassigned Elastic IP"
    resource_name = Column(String(128), nullable=False)
    region = Column(String(64), nullable=False, default="us-east-1")
    status = Column(String(32), default="ACTIVE_IDLE") # ACTIVE_IDLE, REMEDIATED, IGNORED
    monthly_waste_cost = Column(Float, nullable=False)
    last_detected = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    details = Column(JSON, nullable=True)
