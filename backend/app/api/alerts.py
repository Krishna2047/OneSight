from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.billing import BillingRecord, IdleResource
from app.models.alert import AlertRule, AlertHistory, AlertMetricType, AlertSeverity
from app.services.alert_dispatcher import AlertDispatcher

router = APIRouter(prefix="/alerts", tags=["AWS Alert Rules & Dispatcher"])

def get_tenant_id(x_tenant_id: Optional[str] = Header("tenant-acme")) -> str:
    return x_tenant_id or "tenant-acme"

class AlertRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    provider: str = "AWS"
    account_filter: Optional[str] = None
    metric_type: AlertMetricType
    threshold_value: float
    service_filter: Optional[str] = None
    severity: AlertSeverity = AlertSeverity.WARNING
    channels: List[str] = ["SLACK", "DISCORD", "WEBHOOK"]
    webhook_url: Optional[str] = None
    is_enabled: bool = True

class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    account_filter: Optional[str] = None
    metric_type: Optional[AlertMetricType] = None
    threshold_value: Optional[float] = None
    service_filter: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    channels: Optional[List[str]] = None
    webhook_url: Optional[str] = None
    is_enabled: Optional[bool] = None

class TestAlertRequest(BaseModel):
    channel: str = "SLACK" # SLACK, DISCORD, WEBHOOK, EMAIL
    webhook_url: Optional[str] = None
    severity: AlertSeverity = AlertSeverity.WARNING
    title: str = "AWS Billing Alert Diagnostic"
    message: str = "OneSight verified AWS Cost Alert notification delivery."

@router.get("/rules")
def list_alert_rules(
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    rules = db.query(AlertRule).filter(AlertRule.tenant_id == tenant_id).order_by(AlertRule.id.asc()).all()
    return [
        {
            "id": r.id,
            "tenant_id": r.tenant_id,
            "name": r.name,
            "description": r.description,
            "provider": r.provider,
            "account_filter": r.account_filter,
            "metric_type": r.metric_type,
            "threshold_value": r.threshold_value,
            "service_filter": r.service_filter,
            "severity": r.severity,
            "channels": r.channels or [],
            "webhook_url": r.webhook_url,
            "is_enabled": r.is_enabled,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in rules
    ]

@router.post("/rules")
def create_alert_rule(
    rule_in: AlertRuleCreate,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    rule_data = rule_in.model_dump()
    rule_data["tenant_id"] = tenant_id
    rule = AlertRule(**rule_data)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"status": "SUCCESS", "id": rule.id, "name": rule.name}

@router.put("/rules/{rule_id}")
def update_alert_rule(
    rule_id: int,
    rule_in: AlertRuleUpdate,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    update_data = rule_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(rule, field, val)

    db.commit()
    return {"status": "SUCCESS", "id": rule.id}

@router.delete("/rules/{rule_id}")
def delete_alert_rule(rule_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    db.delete(rule)
    db.commit()
    return {"status": "SUCCESS", "message": f"Rule {rule_id} deleted."}

@router.get("/history")
def get_alert_history(
    limit: int = 50,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    history = db.query(AlertHistory).filter(
        AlertHistory.tenant_id == tenant_id
    ).order_by(AlertHistory.sent_at.desc()).limit(limit).all()

    return [
        {
            "id": h.id,
            "tenant_id": h.tenant_id,
            "rule_name": h.rule_name,
            "channel": h.channel,
            "severity": h.severity,
            "title": h.title,
            "message": h.message,
            "status": h.status,
            "sent_at": h.sent_at.isoformat() if h.sent_at else None,
            "response_payload": h.response_payload
        }
        for h in history
    ]

@router.post("/test")
def send_test_alert(
    req: TestAlertRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    payload = {
        "title": req.title,
        "message": req.message,
        "severity": req.severity,
        "provider": "AWS",
        "service": "Amazon Bedrock (GenAI)",
        "cost_delta": 64.20,
        "pct_deviation": 32.5
    }

    results = AlertDispatcher.dispatch_all(
        db=db,
        rule_name="AWS Verification Diagnostic",
        channels=[req.channel],
        payload_data=payload,
        webhook_override=req.webhook_url
    )

    first_result = results[0] if results else None

    return {
        "status": "DISPATCHED",
        "channel": req.channel,
        "result_status": first_result.status if first_result else "UNKNOWN",
        "details": first_result.response_payload if first_result else {}
    }
