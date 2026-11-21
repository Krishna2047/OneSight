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
