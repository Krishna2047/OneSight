from typing import Dict, Any, List, Optional
import os
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, Header, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.config import settings
from app.models.tenant import Tenant, AWSAccount
from app.models.billing import BillingRecord, IdleResource, CloudProvider
from app.services.cloud_simulator import seed_multitenant_aws_data
from app.services.aws_cost_explorer import AWSCostExplorerService
from app.services.aws_live_service import AWSLiveCostExplorerService

router = APIRouter(prefix="/billing", tags=["AWS Billing & Cost Explorer"])

class AWSConnectCredentialsRequest(BaseModel):
    account_id: Optional[str] = None
    account_name: Optional[str] = "AWS Production Account"
    access_key_id: str
    secret_access_key: str
    session_token: Optional[str] = None
    region: str = "us-east-1"
    role_arn: Optional[str] = None
    sync_immediately: bool = True
    days: int = 30

class AWSOnboardSTSRequest(BaseModel):
    role_arn: str
    external_id: str
    sync_immediately: bool = True
    days: int = 30

def get_tenant_id(x_tenant_id: Optional[str] = Header("tenant-acme")) -> str:
    return x_tenant_id or "tenant-acme"

@router.get("/tenants")
def list_tenants(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Returns list of tenants and their configured AWS accounts.
    """
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "plan": t.plan,
            "aws_accounts": [
                {
                    "account_id": a.account_id,
                    "account_name": a.account_name,
                    "account_type": a.account_type,
                    "region": a.default_region,
                    "status": a.status
                }
                for a in t.aws_accounts
            ]
        }
        for t in tenants
    ]

@router.get("/accounts")
def list_aws_accounts(
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    accounts = db.query(AWSAccount).filter(AWSAccount.tenant_id == tenant_id).all()
    return [
        {
            "account_id": a.account_id,
            "account_name": a.account_name,
            "account_type": a.account_type,
            "region": a.default_region,
            "status": a.status
        }
        for a in accounts
    ]

@router.get("/dashboard-summary")
def get_dashboard_summary(
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns high-fidelity summary metrics matching the Dribbble Cost Optimization Dashboard.
    """
    kpi = AWSCostExplorerService.get_kpi_summary(db, tenant_id=tenant_id)
    total_spend = kpi["total_spend"]
    forecast = kpi["forecast_month_end"]
    
    # Top resource expenses
    svc_breakdown = db.query(
        BillingRecord.service_name,
        func.sum(BillingRecord.cost).label("cost")
    ).filter(
        BillingRecord.tenant_id == tenant_id
    ).group_by(BillingRecord.service_name)\
     .order_by(func.sum(BillingRecord.cost).desc()).limit(8).all()

    top_resources = [
        {"name": row[0], "cost": round(row[1], 2), "unit": "$"}
        for row in svc_breakdown
    ]

    # Pools / Accounts requiring attention (matching Image 2)
    accounts = db.query(AWSAccount).filter(AWSAccount.tenant_id == tenant_id).all()
    pools = [
        {
            "id": 1,
            "name": "AWS Production Core",
            "provider": "AWS",
            "limit": 35000.0,
            "expenses_this_month": round(total_spend * 0.58, 2),
            "expenses_change_pct": 50,
            "forecast_this_month": round(forecast * 0.58, 2),
            "forecast_change_pct": 50,
            "owner": "Adam Prowler",
            "status": "ATTENTION"
        },
        {
            "id": 2,
            "name": "Acme AI & Data Platform",
            "provider": "AWS",
            "limit": 25000.0,
            "expenses_this_month": round(total_spend * 0.32, 2),
            "expenses_change_pct": 60,
            "forecast_this_month": round(forecast * 0.34, 2),
            "forecast_change_pct": 30,
            "owner": "Washma Bhat",
            "status": "ATTENTION"
        },
        {
            "id": 3,
            "name": "Acme Staging & QA Lab",
            "provider": "AWS",
            "limit": 8000.0,
            "expenses_this_month": round(total_spend * 0.10, 2),
            "expenses_change_pct": 40,
            "forecast_this_month": round(forecast * 0.08, 2),
            "forecast_change_pct": 20,
            "owner": "Craig Larson",
            "status": "NORMAL"
        },
        {
            "id": 4,
            "name": "AWS Security & Audit Pool",
            "provider": "AWS",
            "limit": 5000.0,
            "expenses_this_month": 1250.0,
            "expenses_change_pct": 15,
            "forecast_this_month": 1400.0,
            "forecast_change_pct": 10,
            "owner": "Ethan Winters",
            "status": "NORMAL"
        }
    ]

    # Policy violations (matching Image 1)
    policy_violations = [
        {
            "id": 1,
            "name": "Buckets count in us-east-1",
            "last_check": "1 day ago",
            "type": "QUOTA",
            "status_text": "34",
            "severity": "CRITICAL"
        },
        {
            "id": 2,
            "name": "Environments total budget",
            "last_check": "1 day ago",
            "type": "BUDGET",
            "status_text": "$234.90",
            "severity": "CRITICAL"
        },
        {
            "id": 3,
            "name": "Instance tagging policy",
            "last_check": "1 day ago",
            "type": "TAGGING",
            "status_text": "9 violations right now",
            "severity": "CRITICAL"
        },
        {
            "id": 4,
            "name": "Unattached EBS retention limit",
            "last_check": "1 day ago",
            "type": "STORAGE",
            "status_text": "5 volumes unattached > 14d",
            "severity": "CRITICAL"
        }
    ]

    return {
        "kpi": {
            "organisational_expenses": round(total_spend, 2),
            "organisational_expenses_k": f"${total_spend/1000:.1f}k",
            "forecast_expense": round(forecast, 2),
            "forecast_expense_k": f"${forecast/1000:.1f}k",
            "no_of_resources": 1042,
            "no_of_regions": 12,
            "change_pct": 10,
            "change_type": "down"
        },
        "organisation_expenses_chart": {
            "budget_limit": 397500.0,
            "budget_limit_k": "$397.5k",
            "months": [
                {"month": "August", "amount": 165200.0, "amount_k": "$165.2k", "is_forecast": False},
                {"month": "Sep", "amount": round(total_spend, 2), "amount_k": f"${total_spend/1000:.1f}k", "is_forecast": False},
                {"month": "Sep (forecast)", "amount": 122600.0, "amount_k": "$122.6k", "is_forecast": True}
            ]
        },
        "potential_savings": {
            "month_forecast_k": f"${forecast/1000:.1f}k",
            "savings_delivered": 24300.0,
            "savings_delivered_k": "$24.3k",
            "remaining_savings": 88300.0,
            "remaining_savings_k": "$88.3k",
            "cost_count": 100,
            "security_count": 200,
            "critical_count": 300
        },
        "top_resource_expenses": top_resources,
        "policy_violations": policy_violations,
        "pools_requiring_attention": pools
    }

@router.get("/aws/kpi")
def get_aws_kpi(
    account_id: Optional[str] = None,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    safe_account_id = account_id if isinstance(account_id, str) else None
    safe_tenant_id = tenant_id if isinstance(tenant_id, str) else "tenant-acme"
    return AWSCostExplorerService.get_kpi_summary(db, tenant_id=safe_tenant_id, account_id=safe_account_id)

@router.get("/aws/cost-explorer")
def query_cost_explorer(
    group_by: str = "service",
    days: int = 30,
    account_id: Optional[str] = None,
    service_filter: Optional[str] = None,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    safe_account_id = account_id if isinstance(account_id, str) else None
    safe_service_filter = service_filter if isinstance(service_filter, str) else None
    safe_tenant_id = tenant_id if isinstance(tenant_id, str) else "tenant-acme"

    return AWSCostExplorerService.query_cost_and_usage(
        db=db,
        tenant_id=safe_tenant_id,
        group_by=group_by,
        days=days if isinstance(days, int) else 30,
        account_id=safe_account_id,
        service_filter=safe_service_filter
    )

@router.get("/idle-resources")
def get_idle_resources(
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    items = db.query(IdleResource).filter(
        IdleResource.tenant_id == tenant_id
    ).order_by(IdleResource.monthly_waste_cost.desc()).all()
    
    total_waste = sum(i.monthly_waste_cost for i in items)

    return {
        "tenant_id": tenant_id,
        "total_monthly_waste": round(total_waste, 2),
        "total_annualized_waste": round(total_waste * 12.0, 2),
        "idle_resources": [
            {
                "id": i.id,
                "tenant_id": i.tenant_id,
                "provider": i.provider,
                "account_id": i.account_id,
                "account_name": i.account_name,
                "resource_id": i.resource_id,
                "resource_name": i.resource_name,
                "resource_type": i.resource_type,
                "region": i.region,
                "monthly_waste_cost": round(i.monthly_waste_cost, 2),
                "status": i.status,
                "details": i.details
            }
            for i in items
        ]
    }

@router.post("/seed")
def seed_billing_data(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    count = seed_multitenant_aws_data(db, days=days)
    return {
        "status": "SUCCESS",
        "message": f"Successfully seeded {count} granular AWS Cost Explorer records across multiple tenants.",
        "records_count": count
    }

@router.get("/aws/live-status")
def get_aws_live_status(
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Checks if real AWS credentials are configured and reachable.
    """
    verification = AWSLiveCostExplorerService.verify_credentials()

    live_records_count = db.query(BillingRecord).filter(
        BillingRecord.tenant_id == tenant_id,
        BillingRecord.provider == CloudProvider.AWS
    ).count()

    return {
        "is_connected": verification["success"],
        "account_id": verification.get("account_id"),
        "verification": verification,
        "live_records_count": live_records_count,
        "env_credentials_present": bool(os.environ.get("AWS_ACCESS_KEY_ID") or settings.AWS_ACCESS_KEY_ID)
    }

@router.post("/aws/connect-credentials")
def connect_aws_credentials(
    req: AWSConnectCredentialsRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Verifies live AWS credentials against AWS Cost Explorer API,
    persists them in environment / session, and optionally syncs real live data.
    """
    verify = AWSLiveCostExplorerService.verify_credentials(
        access_key_id=req.access_key_id,
        secret_access_key=req.secret_access_key,
        session_token=req.session_token,
        region=req.region,
        role_arn=req.role_arn
    )
    if not verify["success"]:
        return {
            "status": "FAILED",
            "message": verify["message"],
            "error_code": verify.get("error_code")
        }

    os.environ["AWS_ACCESS_KEY_ID"] = req.access_key_id
    os.environ["AWS_SECRET_ACCESS_KEY"] = req.secret_access_key
    if req.session_token:
        os.environ["AWS_SESSION_TOKEN"] = req.session_token
    os.environ["AWS_DEFAULT_REGION"] = req.region

    sync_result = {}
    if req.sync_immediately:
        sync_result = AWSLiveCostExplorerService.sync_live_aws_to_database(
            db=db,
            tenant_id=tenant_id,
            account_id=verify.get("account_id") or req.account_id,
            access_key_id=req.access_key_id,
            secret_access_key=req.secret_access_key,
            role_arn=req.role_arn,
            days=req.days
        )

    return {
        "status": "SUCCESS",
        "message": "Real AWS Cost Explorer credentials connected successfully!",
        "account_id": verify.get("account_id"),
        "sync_result": sync_result
    }

@router.post("/aws/sync-live")
def sync_live_aws(
    days: int = Query(30, ge=7, le=90),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Triggers an on-demand live pull from AWS Cost Explorer API.
    """
    res = AWSLiveCostExplorerService.sync_live_aws_to_database(
        db=db,
        tenant_id=tenant_id,
        days=days
    )
    return res

@router.get("/aws/onboarding-template")
def get_aws_onboarding_template(
    tenant_id: str = Depends(get_tenant_id)
) -> Dict[str, Any]:
    """
    Returns 1-Click AWS CloudFormation Onboarding template,
    unique tenant External ID, master SaaS account ID, and quick-launch URL.
    """
    return AWSLiveCostExplorerService.generate_cft_template(tenant_id)

@router.get("/aws/cft-download")
def download_cft_template(
    tenant_id: str = Depends(get_tenant_id)
):
    """
    Downloads personalized onesight-cft.yaml file with tenant External ID.
    """
    data = AWSLiveCostExplorerService.generate_cft_template(tenant_id)
    return Response(
        content=data["cloudformation_yaml"],
        media_type="text/yaml",
        headers={"Content-Disposition": 'attachment; filename="onesight-cft.yaml"'}
    )

@router.post("/aws/onboard-sts-role")
def onboard_sts_role(
    req: AWSOnboardSTSRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    1-Click onboards customer AWS account using STS AssumeRole with External ID.
    Performs organizations auto-discovery and live Cost Explorer sync.
    """
    return AWSLiveCostExplorerService.verify_and_onboard_sts_role(
        db=db,
        tenant_id=tenant_id,
        role_arn=req.role_arn,
        external_id=req.external_id,
        sync_days=req.days
    )
