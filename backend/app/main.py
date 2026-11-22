import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.tenant import Tenant, AWSAccount
from app.models.billing import BillingRecord, CloudProvider
from app.models.agent import AgentActionLog, AgentMemory
from app.services.detector import detect_anomalies
from app.services.agent_runtime import AgenticFinOpsEngine
from app.services.memory_service import Mem0Service
from app.services.aws_live_service import AWSLiveCostExplorerService
from app.api.billing import router as billing_router
from app.api.anomalies import router as anomalies_router
from app.api.alerts import router as alerts_router
from app.api.agents import router as agents_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("onesight")

async def scheduled_daily_aws_sync():
    """
    Automated background FinOps worker:
    Runs periodically (every 6 hours) to pull updated daily spend from AWS Cost Explorer,
    decrypt credentials at rest, refresh local telemetry, and trigger anomaly checks.
    """
    while True:
        try:
            await asyncio.sleep(6 * 3600)  # Every 6 hours
            logger.info("Executing scheduled periodic AWS Cost Explorer sync...")
            db = SessionLocal()
            try:
                accounts = db.query(AWSAccount).filter(AWSAccount.status == "CONNECTED").all()
                for acc in accounts:
                    try:
                        logger.info(f"Auto-syncing spend for account {acc.account_id}...")
                        AWSLiveCostExplorerService.sync_live_aws_to_database(
                            db=db,
                            tenant_id=acc.tenant_id,
                            account_id=acc.account_id,
                            days=30
                        )
                        detect_anomalies(db, tenant_id=acc.tenant_id)
                    except Exception as acc_err:
                        logger.warning(f"Background sync warning for account {acc.account_id}: {acc_err}")
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in background sync worker: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing OneSight database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Ensure Primary Tenant is present
        tenant = db.query(Tenant).filter(Tenant.id == "tenant-acme").first()
        if not tenant:
            logger.info("Initializing primary tenant 'Production Organization'...")
            tenant = Tenant(
                id="tenant-acme",
                name="Production Organization",
                slug="prod-org",
                plan="ENTERPRISE",
                is_active=True
            )
            db.add(tenant)
            db.commit()

        # Bootstrap real AWS Cost Explorer records if database is empty (e.g. fresh PostgreSQL)
        record_count = db.query(BillingRecord).filter(BillingRecord.tenant_id == "tenant-acme").count()
        if record_count == 0:
            seed_file = os.path.join(os.path.dirname(__file__), "data", "real_aws_data.json")
            if os.path.exists(seed_file):
                logger.info(f"Bootstrapping real AWS records from {seed_file}...")
                with open(seed_file, "r") as f:
                    seed_data = json.load(f)

                # Ensure accounts from real data are registered in DB
                for acc_info in seed_data.get("accounts", []):
                    acc_id = acc_info.get("account_id")
                    if acc_id:
                        existing_acc = db.query(AWSAccount).filter(
                            AWSAccount.tenant_id == "tenant-acme",
                            AWSAccount.account_id == acc_id
                        ).first()
                        if not existing_acc:
                            db.add(AWSAccount(
                                tenant_id="tenant-acme",
                                account_id=acc_id,
                                account_name=acc_info.get("account_name", f"AWS Account ({acc_id})"),
                                account_type=acc_info.get("account_type", "MANAGEMENT"),
                                default_region=acc_info.get("default_region", "us-east-1"),
                                status=acc_info.get("status", "CONNECTED")
                            ))
                db.commit()

                recs_to_add = []
                for r in seed_data.get("billing_records", []):
                    ts_val = datetime.now(timezone.utc)
                    if r.get("timestamp"):
                        try:
                            ts_val = datetime.fromisoformat(r["timestamp"])
                        except Exception:
                            pass

                    tags_val = r.get("tags")
                    if isinstance(tags_val, str):
                        try:
                            tags_val = json.loads(tags_val)
                        except Exception:
                            tags_val = {"source": "real-aws"}

                    recs_to_add.append(
                        BillingRecord(
                            tenant_id=r.get("tenant_id", "tenant-acme"),
                            provider=CloudProvider.AWS,
                            account_id=r.get("account_id", ""),
                            account_name=r.get("account_name", "AWS Account"),
                            service_name=r.get("service_name", "Unknown"),
                            region=r.get("region", "us-east-1"),
                            usage_type=r.get("usage_type", "Usage"),
                            charge_type=r.get("charge_type", "Usage"),
                            cost=float(r.get("cost", 0.0)),
                            currency=r.get("currency", "USD"),
                            usage_amount=float(r.get("usage_amount", 0.0)),
                            usage_unit=r.get("usage_unit", "Units"),
                            record_date=r.get("record_date"),
                            timestamp=ts_val,
                            resource_id=r.get("resource_id"),
                            tags=tags_val,
                        )
                    )
                db.bulk_save_objects(recs_to_add)
                db.commit()
                logger.info(f"Successfully bootstrapped {len(recs_to_add)} real AWS Cost Explorer records.")

        # Seed Mem0 default FinOps memories if needed
        Mem0Service.seed_if_empty(db, "tenant-acme")

        logger.info("OneSight database ready.")
    except Exception as e:
        logger.error(f"Error during OneSight startup initialization: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

    # Start background scheduled sync (skip during automated test runs)
    sync_task = None
    if os.getenv("TESTING") != "true" and not os.getenv("PYTEST_CURRENT_TEST"):
        sync_task = asyncio.create_task(scheduled_daily_aws_sync())
    yield
    if sync_task:
        sync_task.cancel()
        try:
            await sync_task
        except asyncio.CancelledError:
            pass
    logger.info("OneSight Backend shutting down.")

app = FastAPI(
    title=f"{settings.PROJECT_NAME} - AWS Cost Explorer & FinOps AI",
    description="Multi-Tenant AWS Billing Observability, Cost Explorer & Agentic AI FinOps Platform",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.method} {request.url}: {exc}", exc_info=True)
    origin = request.headers.get("origin")
    headers = {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
    }
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
    else:
        headers["Access-Control-Allow-Origin"] = "*"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
        headers=headers,
    )

app.include_router(billing_router, prefix=settings.API_V1_STR)
app.include_router(anomalies_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(agents_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "mode": "AWS Cost Explorer & Agentic FinOps (Multi-Tenant)",
        "status": "ONLINE",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
def health():
    return {"status": "HEALTHY"}
