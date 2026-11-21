import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.tenant import Tenant, AWSAccount
from app.models.billing import CloudProvider, BillingRecord, IdleResource
from app.models.alert import AlertRule, AlertMetricType, AlertSeverity

# Detailed AWS Service and Usage Type Profiles
AWS_SERVICE_CATALOG = [
    {
        "service": "Amazon Elastic Compute Cloud - Compute",
        "short_name": "Amazon EC2",
        "usage_types": [
            {"type": "USE1-BoxUsage:c5.2xlarge", "unit": "Hrs", "base_cost": 210.0, "region": "us-east-1"},
            {"type": "USE1-BoxUsage:m5.xlarge", "unit": "Hrs", "base_cost": 140.0, "region": "us-east-1"},
            {"type": "USW2-BoxUsage:r5b.4xlarge", "unit": "Hrs", "base_cost": 280.0, "region": "us-west-2"},
        ]
    },
    {
        "service": "Amazon Simple Storage Service",
        "short_name": "Amazon S3",
        "usage_types": [
            {"type": "TimedStorage-ByteHrs", "unit": "GB-Mo", "base_cost": 65.0, "region": "us-east-1"},
            {"type": "USE1-Requests-Tier1", "unit": "Count", "base_cost": 25.0, "region": "us-east-1"},
            {"type": "USE1-DataTransfer-Out-Bytes", "unit": "GB", "base_cost": 45.0, "region": "us-east-1"},
        ]
    },
    {
        "service": "Amazon Relational Database Service",
        "short_name": "Amazon RDS",
        "usage_types": [
            {"type": "USE1-InstanceUsage:db.r6g.2xlarge", "unit": "Hrs", "base_cost": 160.0, "region": "us-east-1"},
            {"type": "USW2-Multi-AZUsage:db.m6g.xlarge", "unit": "Hrs", "base_cost": 120.0, "region": "us-west-2"},
            {"type": "RDS:StorageUsage", "unit": "GB-Mo", "base_cost": 35.0, "region": "us-east-1"},
        ]
    },
    {
        "service": "Amazon Bedrock",
        "short_name": "Amazon Bedrock (GenAI)",
        "usage_types": [
            {"type": "Claude-3.5-Sonnet-Tokens", "unit": "Million-Tokens", "base_cost": 60.0, "region": "us-east-1"},
            {"type": "Llama-3-70B-Inference", "unit": "Invocations", "base_cost": 30.0, "region": "us-east-1"},
        ]
    },
    {
        "service": "AWS Lambda",
        "short_name": "AWS Lambda",
        "usage_types": [
            {"type": "USE1-Lambda-GB-Second", "unit": "Seconds", "base_cost": 28.0, "region": "us-east-1"},
            {"type": "USE1-Request", "unit": "Requests", "base_cost": 12.0, "region": "us-east-1"},
        ]
    },
    {
        "service": "Amazon Virtual Private Cloud",
        "short_name": "AWS NAT Gateway",
        "usage_types": [
            {"type": "NatGateway-Hours", "unit": "Hrs", "base_cost": 32.0, "region": "us-east-1"},
            {"type": "NatGateway-Bytes", "unit": "GB", "base_cost": 45.0, "region": "us-east-1"},
        ]
    },
    {
        "service": "Amazon DynamoDB",
        "short_name": "Amazon DynamoDB",
        "usage_types": [
            {"type": "USE1-ReadCapacityUnit-Hrs", "unit": "RCU-Hrs", "base_cost": 22.0, "region": "us-east-1"},
            {"type": "USE1-WriteCapacityUnit-Hrs", "unit": "WCU-Hrs", "base_cost": 38.0, "region": "us-east-1"},
        ]
    },
    {
        "service": "Amazon CloudWatch",
        "short_name": "Amazon CloudWatch",
        "usage_types": [
            {"type": "MetricMonitorUsage", "unit": "Metrics", "base_cost": 20.0, "region": "us-east-1"},
            {"type": "Logs-Insights-BytesScanned", "unit": "GB", "base_cost": 18.0, "region": "us-east-1"},
        ]
    },
    {
        "service": "Amazon Elastic Container Service",
        "short_name": "Amazon ECS (Fargate)",
        "usage_types": [
            {"type": "USE1-Fargate-vCPU-Hours", "unit": "vCPU-Hrs", "base_cost": 85.0, "region": "us-east-1"},
            {"type": "USE1-Fargate-GB-Hours", "unit": "GB-Hrs", "base_cost": 45.0, "region": "us-east-1"},
        ]
    },
    {
        "service": "Amazon OpenSearch Service",
        "short_name": "Amazon OpenSearch",
        "usage_types": [
            {"type": "USE1-ESInstance:r6g.xlarge", "unit": "Hrs", "base_cost": 95.0, "region": "us-east-1"},
        ]
    }
]

TENANTS_SEED = [
    {
        "id": "tenant-acme",
        "name": "Acme Corp (Global Cloud)",
        "slug": "acme-corp",
        "plan": "ENTERPRISE",
        "accounts": [
            {"account_id": "112233445566", "account_name": "Acme Production Core", "account_type": "MANAGEMENT", "region": "us-east-1"},
            {"account_id": "223344556677", "account_name": "Acme AI & Data Platform", "account_type": "MEMBER", "region": "us-west-2"},
            {"account_id": "334455667788", "account_name": "Acme Staging & QA", "account_type": "MEMBER", "region": "eu-west-1"},
        ]
    },
    {
        "id": "tenant-fintech",
        "name": "FinTech Labs Inc",
        "slug": "fintech-labs",
        "plan": "PRO",
        "accounts": [
            {"account_id": "556677889900", "account_name": "FinTech Core Banking", "account_type": "MANAGEMENT", "region": "us-east-1"},
            {"account_id": "667788990011", "account_name": "FinTech ML Risk Engine", "account_type": "MEMBER", "region": "us-west-2"},
        ]
    }
]

IDLE_AWS_RESOURCES = [
    {
        "tenant_id": "tenant-acme",
        "account_id": "112233445566",
        "account_name": "Acme Production Core",
        "resource_id": "vol-0a8819ef34c910a2",
        "resource_type": "Unattached EBS Volume",
        "resource_name": "prod-analytics-worker-ebs-gp3",
        "region": "us-east-1",
        "monthly_waste_cost": 165.0,
        "details": {"size_gb": 1650, "volume_type": "gp3", "unattached_days": 44, "iops": 3000}
    },
    {
        "tenant_id": "tenant-acme",
        "account_id": "112233445566",
        "account_name": "Acme Production Core",
        "resource_id": "vol-0b443198cd401ea1",
        "resource_type": "Unattached EBS Volume",
        "resource_name": "staging-db-temp-snapshot-vol",
        "region": "us-east-1",
        "monthly_waste_cost": 92.0,
        "details": {"size_gb": 900, "volume_type": "gp3", "unattached_days": 31}
    },
    {
        "tenant_id": "tenant-acme",
        "account_id": "223344556677",
        "account_name": "Acme AI & Data Platform",
        "resource_id": "nat-0819ff31902eb341",
        "resource_type": "Orphaned NAT Gateway",
        "resource_name": "ai-worker-orphaned-nat-gw",
        "region": "us-west-2",
        "monthly_waste_cost": 74.50,
        "details": {"active_vpc": "vpc-081829e", "throughput_last_30d": "0 MB", "idle_days": 38}
    },
    {
        "tenant_id": "tenant-acme",
        "account_id": "334455667788",
        "account_name": "Acme Staging & QA",
        "resource_id": "eipalloc-019fe88301",
        "resource_type": "Unassigned Elastic IP",
        "resource_name": "qa-bastion-public-ip",
        "region": "us-east-1",
        "monthly_waste_cost": 7.20,
        "details": {"allocated_date": "2026-08-15", "instance_id": None}
    },
    {
        "tenant_id": "tenant-acme",
        "account_id": "112233445566",
        "account_name": "Acme Production Core",
        "resource_id": "eipalloc-07281bc89a",
        "resource_type": "Unassigned Elastic IP",
        "resource_name": "legacy-nat-eip-backup",
        "region": "us-east-1",
        "monthly_waste_cost": 7.20,
        "details": {"allocated_date": "2026-09-01", "instance_id": None}
    }
]

AWS_ALERT_RULES_SEED = [
    {
        "tenant_id": "tenant-acme",
        "name": "AWS Bedrock GenAI Surge (> $200/day)",
        "description": "Alerts if Claude 3.5 Sonnet / Llama token consumption surges unexpectedly.",
        "provider": "AWS",
        "service_filter": "Amazon Bedrock (GenAI)",
        "metric_type": AlertMetricType.SERVICE_BUDGET,
        "threshold_value": 200.0,
        "severity": AlertSeverity.CRITICAL,
        "channels": ["SLACK", "DISCORD", "WEBHOOK", "EMAIL"],
        "is_enabled": True
    },
    {
        "tenant_id": "tenant-acme",
        "name": "Daily Multi-Account AWS Spend Spike (>30%)",
        "description": "Alerts when daily AWS spend spikes more than 30% above the 7-day rolling average.",
        "provider": "AWS",
        "metric_type": AlertMetricType.DAILY_SPEND_SPIKE,
        "threshold_value": 30.0,
        "severity": AlertSeverity.HIGH,
        "channels": ["SLACK", "DISCORD"],
        "is_enabled": True
    },
    {
        "tenant_id": "tenant-acme",
        "name": "Monthly AWS Account Budget Limit ($35,000)",
        "description": "Alerts when cumulative monthly AWS spend reaches $35k.",
        "provider": "AWS",
        "metric_type": AlertMetricType.MONTHLY_BUDGET_LIMIT,
        "threshold_value": 35000.0,
        "severity": AlertSeverity.WARNING,
        "channels": ["SLACK", "EMAIL"],
        "is_enabled": True
    },
    {
        "tenant_id": "tenant-acme",
        "name": "Idle AWS Storage & Gateway Waste Threshold ($300/mo)",
        "description": "Alerts if unattached EBS volumes and idle NAT Gateways exceed $300/month.",
        "provider": "AWS",
        "metric_type": AlertMetricType.IDLE_WASTE_THRESHOLD,
        "threshold_value": 300.0,
        "severity": AlertSeverity.WARNING,
        "channels": ["SLACK"],
        "is_enabled": True
    }
]

def seed_multitenant_aws_data(db: Session, days: int = 30):
    """
    Seeds multi-tenant organizations, linked AWS member accounts, 30 days of
    granular AWS Cost Explorer records with real usage types, tags, and idle assets.
    """
    # Clear existing data to avoid duplicate collisions
    db.query(BillingRecord).delete()
    db.query(IdleResource).delete()
    db.query(AlertRule).delete()
    db.query(AWSAccount).delete()
    db.query(Tenant).delete()
    db.commit()

    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=days - 1)

    # 1. Seed Tenants and AWS Accounts
    for t_data in TENANTS_SEED:
        tenant = Tenant(
            id=t_data["id"],
            name=t_data["name"],
            slug=t_data["slug"],
            plan=t_data["plan"]
        )
        db.add(tenant)
        db.flush()

        for acc in t_data["accounts"]:
            aws_acc = AWSAccount(
                tenant_id=tenant.id,
                account_id=acc["account_id"],
                account_name=acc["account_name"],
                account_type=acc["account_type"],
                default_region=acc["region"]
            )
            db.add(aws_acc)

    db.commit()

    # 2. Seed Billing Records for tenant-acme
    acme_accounts = TENANTS_SEED[0]["accounts"]
    records: List[BillingRecord] = []

    # Map injected spikes
    anomaly_dates = {
        (end_date - timedelta(days=2)).strftime("%Y-%m-%d"): {
            "Amazon Bedrock (GenAI)": 690.0, # Runaway batch evaluation script
            "AWS NAT Gateway": 420.0,        # Multi-AZ container image pull through NAT
        },
        (end_date - timedelta(days=1)).strftime("%Y-%m-%d"): {
            "Amazon Elastic Compute Cloud - Compute": 580.0, # Runaway autoscaling group
        }
    }

    current = start_date
    while current <= end_date:
        date_str = current.strftime("%Y-%m-%d")
        dow_factor = 0.82 if current.weekday() >= 5 else 1.0 # weekend drop

        for svc in AWS_SERVICE_CATALOG:
            for usage in svc["usage_types"]:
                # Distribute across linked accounts
                for acc_idx, acc in enumerate(acme_accounts):
                    # Bedrock primarily in AI Platform account; EC2/RDS in Production
                    if "Bedrock" in svc["short_name"] and acc["account_id"] != "223344556677":
                        continue
                    if "OpenSearch" in svc["short_name"] and acc["account_id"] == "334455667788":
                        continue

                    # Check for injected anomaly
                    injected = None
                    if date_str in anomaly_dates:
                        injected = anomaly_dates[date_str].get(svc["short_name"])

                    if injected is not None and acc_idx == 0:
                        cost = injected / len(svc["usage_types"])
                        usage_val = cost * random.uniform(3.0, 5.0)
                    else:
                        weight = 0.55 if acc_idx == 0 else (0.35 if acc_idx == 1 else 0.10)
                        noise = random.uniform(0.92, 1.08)
                        cost = round((usage["base_cost"] * weight * dow_factor * noise), 2)
                        usage_val = round(cost * random.uniform(1.2, 1.8), 2)

                    team_tag = "AI-Platform" if "Bedrock" in svc["short_name"] else ("Core-Infra" if "EC2" in svc["short_name"] else "Data-Platform")
                    env_tag = "Production" if "Production" in acc["account_name"] else ("Staging" if "Staging" in acc["account_name"] else "AI-Sandbox")

                    records.append(
                        BillingRecord(
                            tenant_id="tenant-acme",
                            provider=CloudProvider.AWS,
                            account_id=acc["account_id"],
                            account_name=acc["account_name"],
                            service_name=svc["short_name"],
                            region=usage["region"],
                            usage_type=usage["type"],
                            charge_type="Usage",
                            cost=cost,
                            currency="USD",
                            usage_amount=usage_val,
                            usage_unit=usage["unit"],
                            record_date=date_str,
                            timestamp=datetime.combine(current, datetime.min.time(), tzinfo=timezone.utc),
                            tags={"Environment": env_tag, "Team": team_tag, "Project": "OneSight"}
                        )
                    )

        current += timedelta(days=1)

    db.bulk_save_objects(records)

    # 3. Seed Idle Resources
    for item in IDLE_AWS_RESOURCES:
        idle_obj = IdleResource(
            tenant_id=item["tenant_id"],
            provider=CloudProvider.AWS,
            account_id=item["account_id"],
            account_name=item["account_name"],
            resource_id=item["resource_id"],
            resource_type=item["resource_type"],
            resource_name=item["resource_name"],
            region=item["region"],
            monthly_waste_cost=item["monthly_waste_cost"],
            status="ACTIVE_IDLE",
            details=item["details"]
        )
        db.add(idle_obj)

    # 4. Seed Alert Rules
    for r_data in AWS_ALERT_RULES_SEED:
        rule = AlertRule(**r_data)
        db.add(rule)

    db.commit()
    return len(records)
