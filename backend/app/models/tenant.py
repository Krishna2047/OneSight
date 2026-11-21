from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(64), primary_key=True, index=True) # e.g. "tenant-acme-prod"
    name = Column(String(128), nullable=False)
    slug = Column(String(64), unique=True, index=True, nullable=False)
    plan = Column(String(32), default="ENTERPRISE") # STARTER, PRO, ENTERPRISE
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    aws_accounts = relationship("AWSAccount", back_populates="tenant", cascade="all, delete-orphan")

class AWSAccount(Base):
    __tablename__ = "aws_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    account_id = Column(String(12), nullable=False, index=True) # 12-digit AWS account ID
    account_name = Column(String(128), nullable=False)
    account_type = Column(String(32), default="MEMBER") # MANAGEMENT (Payer) or MEMBER (Linked)
    default_region = Column(String(32), default="us-east-1")
    status = Column(String(32), default="CONNECTED") # CONNECTED, PENDING, ERROR
    role_arn = Column(String(256), nullable=True) # Cross-account IAM role for live CUR/Cost Explorer
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="aws_accounts")
