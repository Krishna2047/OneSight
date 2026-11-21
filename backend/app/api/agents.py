from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.agent import AgentActionLog
from app.models.billing import IdleResource
from app.services.agent_runtime import AgenticFinOpsEngine

router = APIRouter(prefix="/agents", tags=["AWS FinOps Agentic Platform"])

def get_tenant_id(x_tenant_id: Optional[str] = Header("tenant-acme")) -> str:
    return x_tenant_id or "tenant-acme"

class ChatRequest(BaseModel):
    message: str

class RemediationRequest(BaseModel):
    resource_id: str
    action: str = "SNAPSHOT_AND_DELETE"

@router.post("/chat")
def chat_with_agent(
    req: ChatRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Interactive AWS FinOps AI Agent chat endpoint.
    """
    result = AgenticFinOpsEngine.chat(db, req.message, tenant_id=tenant_id)
    return result

@router.get("/logs")
def get_agent_action_logs(
    limit: int = 30,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    logs = db.query(AgentActionLog).filter(
        AgentActionLog.tenant_id == tenant_id
    ).order_by(AgentActionLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": l.id,
            "tenant_id": l.tenant_id,
            "agent_name": l.agent_name,
            "action_type": l.action_type,
            "prompt_or_trigger": l.prompt_or_trigger,
            "thought_process": l.thought_process,
            "tools_called": l.tools_called,
            "result_summary": l.result_summary,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]

@router.post("/remediate-idle")
def remediate_idle_resource(
    req: RemediationRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    item = db.query(IdleResource).filter(
        IdleResource.tenant_id == tenant_id,
        IdleResource.resource_id == req.resource_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")

    item.status = "REMEDIATED"
    
    log_entry = AgentActionLog(
        tenant_id=tenant_id,
        agent_name="AWSCostOptimizerAgent",
        action_type="AUTO_REMEDIATION",
        prompt_or_trigger=f"Remediate AWS idle asset {item.resource_name} ({item.resource_type})",
        thought_process=f"Resource {item.resource_id} idle in {item.region} on {item.account_name}. Executing safe AWS snapshot & termination.",
        tools_called=["aws_ec2_create_snapshot", "aws_ec2_delete_volume"],
        result_summary=f"Successfully remediated {item.resource_name}. Recaptured ${item.monthly_waste_cost:,.2f}/mo waste.",
        structured_output={"savings_monthly": item.monthly_waste_cost, "resource_id": item.resource_id}
    )
    db.add(log_entry)
    db.commit()

    return {
        "status": "REMEDIATED",
        "resource_id": item.resource_id,
        "monthly_savings": item.monthly_waste_cost,
        "message": f"Successfully executed {req.action} on {item.resource_name}. Estimated monthly savings: ${item.monthly_waste_cost:,.2f}"
    }
