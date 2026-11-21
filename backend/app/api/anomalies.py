from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.billing import BillingRecord, CloudProvider
from app.models.anomaly import AnomalyEvent, AnomalySeverity, AnomalyStatus
from app.services.detector import detect_anomalies
from app.services.agent_runtime import AgenticFinOpsEngine
from app.services.alert_dispatcher import AlertDispatcher

router = APIRouter(prefix="/anomalies", tags=["AWS Cost Anomaly Detection"])

def get_tenant_id(x_tenant_id: Optional[str] = Header("tenant-acme")) -> str:
    return x_tenant_id or "tenant-acme"

class SpikeSimulationRequest(BaseModel):
    account_id: str = "223344556677"
    service_name: str = "Amazon Bedrock (GenAI)"
    spike_cost: float = 720.0
    reason: Optional[str] = "Runaway automated GenAI batch prompt evaluation script"

class StatusUpdateRequest(BaseModel):
    status: AnomalyStatus

@router.get("")
def list_anomalies(
    account_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Lists detected AWS cost anomalies for the active tenant.
    """
    query = db.query(AnomalyEvent).filter(AnomalyEvent.tenant_id == tenant_id)

    if account_id and account_id != "ALL":
        query = query.filter(AnomalyEvent.account_id == account_id)
    if severity and severity != "ALL":
        query = query.filter(AnomalyEvent.severity == severity)
    if status and status != "ALL":
        query = query.filter(AnomalyEvent.status == status)

    anomalies = query.order_by(AnomalyEvent.cost_delta.desc()).all()

    return [
        {
            "id": a.id,
            "tenant_id": a.tenant_id,
            "provider": a.provider,
            "account_id": a.account_id,
            "account_name": a.account_name,
            "service_name": a.service_name,
            "usage_type": a.usage_type,
            "region": a.region,
            "anomaly_date": a.anomaly_date,
            "current_cost": round(a.current_cost, 2),
            "baseline_cost": round(a.baseline_cost, 2),
            "cost_delta": round(a.cost_delta, 2),
            "deviation_percent": a.deviation_percent,
            "z_score": a.z_score,
            "severity": a.severity,
            "status": a.status,
            "root_cause_summary": a.root_cause_summary,
            "suspect_resources": a.suspect_resources,
            "remediation_recommendations": a.remediation_recommendations,
            "ai_confidence": a.ai_confidence,
            "rca_generated_at": a.rca_generated_at.isoformat() if a.rca_generated_at else None
        }
        for a in anomalies
    ]

@router.get("/{anomaly_id}")
def get_anomaly_details(anomaly_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Retrieves full details and AI RCA for a specific anomaly.
    """
    anomaly = db.query(AnomalyEvent).filter(AnomalyEvent.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    return {
        "id": anomaly.id,
        "tenant_id": anomaly.tenant_id,
        "provider": anomaly.provider,
        "account_id": anomaly.account_id,
        "account_name": anomaly.account_name,
        "service_name": anomaly.service_name,
        "usage_type": anomaly.usage_type,
        "region": anomaly.region,
        "anomaly_date": anomaly.anomaly_date,
        "current_cost": round(anomaly.current_cost, 2),
        "baseline_cost": round(anomaly.baseline_cost, 2),
        "cost_delta": round(anomaly.cost_delta, 2),
        "deviation_percent": anomaly.deviation_percent,
        "z_score": anomaly.z_score,
        "severity": anomaly.severity,
        "status": anomaly.status,
        "root_cause_summary": anomaly.root_cause_summary,
        "suspect_resources": anomaly.suspect_resources,
        "remediation_recommendations": anomaly.remediation_recommendations,
        "ai_confidence": anomaly.ai_confidence,
        "rca_generated_at": anomaly.rca_generated_at.isoformat() if anomaly.rca_generated_at else None
    }

@router.post("/detect")
def trigger_detection(
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Runs AWS Cost Anomaly Detection for the tenant and triggers autonomous AI RCA.
    """
    detected = detect_anomalies(db, tenant_id=tenant_id)

    rca_count = 0
    for anomaly in detected:
        if not anomaly.root_cause_summary:
            try:
                AgenticFinOpsEngine.run_rca(db, anomaly.id)
                rca_count += 1
            except Exception:
                pass

    return {
        "status": "SUCCESS",
        "tenant_id": tenant_id,
        "anomalies_detected_count": len(detected),
        "rca_auto_generated_count": rca_count,
        "anomalies": [
            {
                "id": a.id,
                "account_name": a.account_name,
                "service_name": a.service_name,
                "cost_delta": a.cost_delta,
                "deviation_percent": a.deviation_percent,
                "severity": a.severity
            }
            for a in detected
        ]
    }

@router.post("/simulate-spike")
def simulate_cost_spike(
    req: SpikeSimulationRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Injects a live cost spike into today's AWS telemetry to test detection,
    Agentic RCA, and multi-channel alerting.
    """
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    record = db.query(BillingRecord).filter(
        BillingRecord.tenant_id == tenant_id,
        BillingRecord.account_id == req.account_id,
        BillingRecord.service_name == req.service_name,
        BillingRecord.record_date == today_str
    ).first()

    if record:
        record.cost = req.spike_cost
        record.usage_amount = req.spike_cost * 3.5
    else:
        record = BillingRecord(
            tenant_id=tenant_id,
            provider=CloudProvider.AWS,
            account_id=req.account_id,
            account_name="Acme Production Core" if req.account_id == "112233445566" else "Acme AI & Data Platform",
            service_name=req.service_name,
            region="us-east-1",
            cost=req.spike_cost,
            usage_amount=req.spike_cost * 3.5,
            usage_unit="Units",
            record_date=today_str,
            tags={"Reason": req.reason, "Environment": "Production"}
        )
        db.add(record)

    db.commit()

    detected = detect_anomalies(db, tenant_id=tenant_id)
    
    target_anomaly = None
    for a in detected:
        if a.service_name == req.service_name and a.anomaly_date == today_str:
            target_anomaly = a
            AgenticFinOpsEngine.run_rca(db, a.id)
            break

    if target_anomaly:
        alert_payload = {
            "title": f"AWS Cost Anomaly: {target_anomaly.service_name} on {target_anomaly.account_name}",
            "severity": target_anomaly.severity,
            "provider": "AWS",
            "service": target_anomaly.service_name,
            "cost_delta": target_anomaly.cost_delta,
            "pct_deviation": target_anomaly.deviation_percent,
            "message": f"Daily spend on {target_anomaly.service_name} spiked to ${target_anomaly.current_cost:.2f} (+{target_anomaly.deviation_percent:.1f}% above baseline). Diagnosed root cause: {target_anomaly.root_cause_summary or 'In progress'}"
        }
        AlertDispatcher.dispatch_all(
            db=db,
            rule_name=f"AWS Anomaly Trigger: {target_anomaly.service_name}",
            channels=["SLACK", "DISCORD", "WEBHOOK", "EMAIL"],
            payload_data=alert_payload
        )

    return {
        "status": "SPIKE_INJECTED_AND_EVALUATED",
        "tenant_id": tenant_id,
        "account_id": req.account_id,
        "service": req.service_name,
        "date": today_str,
        "spiked_cost": req.spike_cost,
        "anomaly_flagged": target_anomaly is not None,
        "anomaly_id": target_anomaly.id if target_anomaly else None
    }

@router.post("/{anomaly_id}/rca")
def trigger_rca(anomaly_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Manually triggers or refreshes the Agentic AI Root Cause Analysis on an anomaly.
    """
    anomaly = AgenticFinOpsEngine.run_rca(db, anomaly_id)
    return {
        "status": "RCA_COMPLETE",
        "anomaly_id": anomaly.id,
        "root_cause_summary": anomaly.root_cause_summary,
        "suspect_resources": anomaly.suspect_resources,
        "remediation_recommendations": anomaly.remediation_recommendations,
        "ai_confidence": anomaly.ai_confidence
    }

@router.patch("/{anomaly_id}/status")
def update_anomaly_status(
    anomaly_id: int,
    req: StatusUpdateRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    anomaly = db.query(AnomalyEvent).filter(AnomalyEvent.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    anomaly.status = req.status
    db.commit()
    return {"status": "SUCCESS", "anomaly_id": anomaly.id, "new_status": anomaly.status}
