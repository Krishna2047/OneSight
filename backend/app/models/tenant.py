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
    auth_method = Column(String(32), default="STS_ROLE") # STS_ROLE, IAM_KEYS
    
    # Encrypted Credentials (AES-256 Fernet at rest)
    encrypted_access_key_id = Column(String(512), nullable=True)
    encrypted_secret_access_key = Column(String(512), nullable=True)
    encrypted_session_token = Column(String(1024), nullable=True)
    encrypted_external_id = Column(String(512), nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="aws_accounts")

    def set_credentials(
        self,
        access_key_id: str = None,
        secret_access_key: str = None,
        session_token: str = None,
        external_id: str = None
    ):
        from app.core.security import encrypt_credential
        if access_key_id:
            self.encrypted_access_key_id = encrypt_credential(access_key_id)
        if secret_access_key:
            self.encrypted_secret_access_key = encrypt_credential(secret_access_key)
        if session_token:
            self.encrypted_session_token = encrypt_credential(session_token)
        if external_id:
            self.encrypted_external_id = encrypt_credential(external_id)

    def get_decrypted_credentials(self):
        from app.core.security import decrypt_credential
        return {
            "access_key_id": decrypt_credential(self.encrypted_access_key_id),
            "secret_access_key": decrypt_credential(self.encrypted_secret_access_key),
            "session_token": decrypt_credential(self.encrypted_session_token),
            "external_id": decrypt_credential(self.encrypted_external_id),
        }
