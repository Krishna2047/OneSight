import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.tenant import Tenant
from app.services.cloud_simulator import seed_multitenant_aws_data
from app.services.detector import detect_anomalies
from app.services.agent_runtime import AgenticFinOpsEngine
from app.api.billing import router as billing_router
from app.api.anomalies import router as anomalies_router
from app.api.alerts import router as alerts_router
from app.api.agents import router as agents_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("onesight")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing OneSight database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        tenant_count = db.query(Tenant).count()
        if tenant_count == 0:
            logger.info("Seeding multi-tenant organizations and granular AWS Cost Explorer records...")
            seed_multitenant_aws_data(db, days=30)
            
            # Run initial detection and RCA for tenant-acme
            detected = detect_anomalies(db, tenant_id="tenant-acme")
            logger.info(f"Initial anomaly detection flagged {len(detected)} AWS cost anomalies.")
            
            for anomaly in detected:
                if not anomaly.root_cause_summary:
                    try:
                        AgenticFinOpsEngine.run_rca(db, anomaly.id)
                    except Exception as e:
                        logger.warning(f"Initial RCA generation warning: {e}")
            logger.info("Database initialized successfully with multi-tenant AWS Cost Explorer records.")
    finally:
        db.close()

    yield
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
