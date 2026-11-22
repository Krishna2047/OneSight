from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from app.core.database import Base

class AgentActionLog(Base):
    __tablename__ = "agent_action_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, default="tenant-acme", index=True)
    agent_name = Column(String(64), nullable=False) # e.g. "AWSFinOpsDiagnosisAgent", "CostOptimizerAgent"
    action_type = Column(String(64), nullable=False) # e.g. "ROOT_CAUSE_ANALYSIS", "IDLE_CLEANUP", "CHAT_QUERY"
    prompt_or_trigger = Column(Text, nullable=False)
    thought_process = Column(Text, nullable=True)
    tools_called = Column(JSON, nullable=True) # list of tool calls executed
    result_summary = Column(Text, nullable=True)
    structured_output = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class AgentMemory(Base):
    """
    Persistent Multi-Tenant FinOps Agent Memory (Mem0 Architecture).
    Stores episodic facts, user preferences, resource exemptions, and FinOps policies.
    Guarantees strict tenant-isolation and multi-provider vector/hybrid retrieval.
    """
    __tablename__ = "agent_memories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, default="tenant-acme", index=True)
    user_id = Column(String(64), nullable=True, default="admin", index=True)
    memory_type = Column(String(64), nullable=False, default="FINOPS_RULE")  # FINOPS_RULE, RESOURCE_EXEMPTION, USER_PREFERENCE, ANOMALY_NOTE
    category = Column(String(64), nullable=True, default="GENERAL")          # EC2, S3, RDS, IDLE_WASTE, BUDGET, GENERAL
    content = Column(Text, nullable=False)                                   # Human readable rule or fact
    embedding_provider = Column(String(64), nullable=True)                   # ollama, openai, gemini, hybrid-cpu-dense
    embedding = Column(JSON, nullable=True)                                  # Dense vector float list for similarity search
    metadata_json = Column(JSON, nullable=True)                              # Arbitrary tags (e.g. {"resource_id": "vol-0a88..."})
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
