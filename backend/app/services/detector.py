import numpy as np
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.billing import BillingRecord, CloudProvider
from app.models.anomaly import AnomalyEvent, AnomalySeverity, AnomalyStatus

def detect_anomalies(
    db: Session,
    tenant_id: str = "tenant-acme",
    lookback_days: int = 14,
    z_threshold: float = 2.0,
    pct_threshold: float = 30.0
) -> List[AnomalyEvent]:
    """
    Scans recent AWS billing records for a tenant against rolling historical baselines
    to identify statistically significant cost spikes (AWS Cost Anomaly Detection).
    """
    # Fetch distinct service, account, and region combinations for this tenant
    services = db.query(
        BillingRecord.provider,
        BillingRecord.account_id,
        BillingRecord.account_name,
        BillingRecord.service_name,
        BillingRecord.region
    ).filter(BillingRecord.tenant_id == tenant_id).distinct().all()

    # Get distinct dates in descending order
    dates_query = db.query(BillingRecord.record_date)\
        .filter(BillingRecord.tenant_id == tenant_id)\
        .distinct()\
        .order_by(BillingRecord.record_date.desc())\
        .limit(lookback_days + 1).all()
    
    if len(dates_query) < 4:
        return []

    available_dates = [d[0] for d in reversed(dates_query)]
    eval_dates = available_dates[-3:]

    newly_detected: List[AnomalyEvent] = []

    for provider, account_id, account_name, service_name, region in services:
        records = db.query(BillingRecord.record_date, func.sum(BillingRecord.cost).label("total_cost"))\
            .filter(
                BillingRecord.tenant_id == tenant_id,
                BillingRecord.provider == provider,
                BillingRecord.account_id == account_id,
                BillingRecord.service_name == service_name,
                BillingRecord.record_date.in_(available_dates)
            )\
            .group_by(BillingRecord.record_date)\
            .order_by(BillingRecord.record_date.asc()).all()

        date_cost_map = {r.record_date: r.total_cost for r in records}
        if len(date_cost_map) < 4:
            continue

        for target_date in eval_dates:
            target_cost = date_cost_map.get(target_date)
            if target_cost is None:
                continue

            history_costs = [
                date_cost_map[d] for d in available_dates
                if d < target_date and d in date_cost_map
            ]

            if len(history_costs) < 3:
                continue

            mean = float(np.mean(history_costs))
            std = float(np.std(history_costs))
            safe_std = std if std > 0.05 * mean else (0.1 * mean if mean > 0 else 1.0)

            z_score = round((target_cost - mean) / safe_std, 2)
            pct_deviation = round(((target_cost - mean) / (mean if mean > 0 else 1.0)) * 100.0, 1)

            # Check if this qualifies as an AWS Cost Anomaly
            if (z_score >= z_threshold or pct_deviation >= pct_threshold) and (target_cost - mean) >= 15.0:
                if z_score >= 4.0 or pct_deviation >= 100.0 or (target_cost - mean) >= 250.0:
                    severity = AnomalySeverity.CRITICAL
                elif z_score >= 2.5 or pct_deviation >= 50.0 or (target_cost - mean) >= 80.0:
                    severity = AnomalySeverity.HIGH
                else:
                    severity = AnomalySeverity.MEDIUM

                existing = db.query(AnomalyEvent).filter(
                    AnomalyEvent.tenant_id == tenant_id,
                    AnomalyEvent.account_id == account_id,
                    AnomalyEvent.service_name == service_name,
                    AnomalyEvent.anomaly_date == target_date
                ).first()

                if not existing:
                    anomaly = AnomalyEvent(
                        tenant_id=tenant_id,
                        provider=provider,
                        account_id=account_id,
                        account_name=account_name,
                        service_name=service_name,
                        region=region or "us-east-1",
                        anomaly_date=target_date,
                        current_cost=round(target_cost, 2),
                        baseline_cost=round(mean, 2),
                        cost_delta=round(target_cost - mean, 2),
                        deviation_percent=pct_deviation,
                        z_score=z_score,
                        severity=severity,
                        status=AnomalyStatus.DETECTED
                    )
                    db.add(anomaly)
                    newly_detected.append(anomaly)
                else:
                    existing.current_cost = round(target_cost, 2)
                    existing.baseline_cost = round(mean, 2)
                    existing.cost_delta = round(target_cost - mean, 2)
                    existing.deviation_percent = pct_deviation
                    existing.z_score = z_score
                    existing.severity = severity
                    newly_detected.append(existing)

    db.commit()
    return newly_detected
