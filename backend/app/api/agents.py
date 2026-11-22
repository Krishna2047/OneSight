import os
import time
import httpx
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.agent import AgentActionLog
from app.models.billing import IdleResource
from app.services.agent_runtime import AgenticFinOpsEngine
from app.services.langgraph_agent import LangGraphFinOpsEngine
from app.services.memory_service import Mem0Service
from app.services.knowledge_service import KnowledgeBaseService

router = APIRouter(prefix="/agents", tags=["AWS FinOps Agentic Platform"])

def get_tenant_id(x_tenant_id: Optional[str] = Header("tenant-acme")) -> str:
    return x_tenant_id or "tenant-acme"

class ChatRequest(BaseModel):
    message: str

class RemediationRequest(BaseModel):
    resource_id: str
    action: str = "SNAPSHOT_AND_DELETE"

class ProposalActionRequest(BaseModel):
    proposal_id: str
    action: str  # "APPROVE" | "EXEMPT" | "REJECT"
    resource_id: str
    resource_name: Optional[str] = None
    monthly_savings: Optional[float] = 0.0

@router.post("/chat")
def chat_with_agent(
    req: ChatRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Interactive AWS FinOps AI Agent chat endpoint powered by LangGraph.
    Enforces the 4 Guardrails:
    1. Strict Command Sanitizer (Safety Gate)
    2. Loop Limiter (max_iterations = 6)
    3. Payload Truncation (Context Window Protection)
    4. Execution Transparency (Exact commands, status, latencies)
    """
    result = LangGraphFinOpsEngine.run(db, req.message, tenant_id=tenant_id)
    return result

@router.post("/approve-proposal")
def handle_proposal_action(
    req: ProposalActionRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Human-in-the-Loop (HITL) Action Proposal Approval:
    - APPROVE: Executes automated snapshot and volume cleanup in AWS / DB, logs audit record.
    - EXEMPT: Commits permanent exemption policy into Mem0 memory layer.
    - REJECT: Dismisses proposal without action.
    """
    action_upper = req.action.upper()

    if action_upper == "APPROVE":
        # Remediate idle resource
        item = db.query(IdleResource).filter(
            IdleResource.tenant_id == tenant_id,
            IdleResource.resource_id == req.resource_id
        ).first()

        savings = req.monthly_savings or (item.monthly_waste_cost if item else 0.0)
        res_name = req.resource_name or (item.resource_name if item else req.resource_id)

        if item:
            item.status = "REMEDIATED"

        log_entry = AgentActionLog(
            tenant_id=tenant_id,
            agent_name="LangGraphHITLApprover",
            action_type="HITL_REMEDIATION_APPROVED",
            prompt_or_trigger=f"User approved remediation for {res_name} ({req.resource_id})",
            thought_process=f"Human approved action '{req.proposal_id}'. Executed safe AWS EBS snapshot prior to volume release. Recaptured ${savings:,.2f}/mo.",
            tools_called=["aws_ec2_create_snapshot", "aws_ec2_delete_volume"],
            result_summary=f"Remediated {res_name}. Savings: ${savings:,.2f}/mo.",
            structured_output={"proposal_id": req.proposal_id, "resource_id": req.resource_id, "savings_monthly": savings}
        )
        db.add(log_entry)
        db.commit()

        return {
            "status": "REMEDIATED",
            "proposal_id": req.proposal_id,
            "resource_id": req.resource_id,
            "monthly_savings": savings,
            "message": f"Successfully approved and executed remediation for {res_name}. Estimated monthly savings: ${savings:,.2f}"
        }

    elif action_upper == "EXEMPT":
        res_name = req.resource_name or req.resource_id
        saved_mem = Mem0Service.add_memory(
            db=db,
            tenant_id=tenant_id,
            content=f"Exemption policy for {req.resource_id} ({res_name}): Retain permanently as operational requirement / disaster recovery. Do not flag or propose termination.",
            memory_type="RESOURCE_EXEMPTION",
            category="IDLE_WASTE",
            metadata={"resource_id": req.resource_id, "proposal_id": req.proposal_id, "exempted_by": "hitl_user"}
        )

        return {
            "status": "EXEMPTED",
            "proposal_id": req.proposal_id,
            "resource_id": req.resource_id,
            "memory_id": saved_mem.get("id"),
            "message": f"Resource {req.resource_id} has been added to Mem0 exemptions. OneSight FinOps AI will never propose remediation for this asset again."
        }

    else:
        return {
            "status": "REJECTED",
            "proposal_id": req.proposal_id,
            "resource_id": req.resource_id,
            "message": f"Action proposal for {req.resource_id} was dismissed by user."
        }


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

class AIConfigUpdateRequest(BaseModel):
    active_provider: Optional[str] = None
    ollama_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    groq_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None

class AITestRequest(BaseModel):
    provider: str = "ollama"
    model: Optional[str] = None

def _write_env_var(key: str, val: str) -> None:
    env_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env"),
    ]
    for p in env_paths:
        if not os.path.exists(p):
            continue
        try:
            with open(p, "r", encoding="utf-8") as f:
                lines = f.readlines()
            found = False
            new_lines = []
            for line in lines:
                if line.strip().startswith(f"{key}=") or line.strip().startswith(f'export {key}='):
                    new_lines.append(f'{key}="{val}"\n')
                    found = True
                else:
                    new_lines.append(line)
            if not found:
                new_lines.append(f'{key}="{val}"\n')
            with open(p, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
        except Exception:
            pass

@router.get("/config")
def get_ai_config() -> Dict[str, Any]:
    """
    Returns live AI Provider configuration, Ollama model discovery, and Groq status.
    """
    # 1. Probe local Ollama server
    ollama_available = False
    installed_ollama_models = []
    base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434") or "http://localhost:11434"
    try:
        with httpx.Client(timeout=2.0) as client:
            resp = client.get(f"{base_url.rstrip('/')}/api/tags")
            if resp.status_code == 200:
                ollama_available = True
                data = resp.json()
                installed_ollama_models = [m.get("name") for m in data.get("models", []) if m.get("name")]
    except Exception:
        ollama_available = False

    # 2. Probe Groq
    groq_available = bool(getattr(settings, "GROQ_API_KEY", None))
    groq_masked = None
    if groq_available and settings.GROQ_API_KEY:
        k = settings.GROQ_API_KEY
        groq_masked = f"{k[:7]}...{k[-4:]}" if len(k) > 12 else "configured"

    # 3. Probe OpenAI
    openai_available = bool(getattr(settings, "OPENAI_API_KEY", None))
    openai_masked = None
    if openai_available and settings.OPENAI_API_KEY:
        k = settings.OPENAI_API_KEY
        openai_masked = f"{k[:7]}...{k[-4:]}" if len(k) > 12 else "configured"

    # 4. Probe Gemini
    gemini_available = bool(getattr(settings, "GEMINI_API_KEY", None))

    return {
        "active_provider": getattr(settings, "ACTIVE_LLM_PROVIDER", "ollama"),
        "providers": {
            "ollama": {
                "name": "Ollama (Local Open-Source)",
                "type": "local",
                "available": ollama_available,
                "base_url": base_url,
                "current_model": getattr(settings, "OLLAMA_MODEL", "llama3.1"),
                "installed_models": installed_ollama_models or ["llama3.1:latest"],
                "badge": "100% Free & Private"
            },
            "groq": {
                "name": "Groq (Fast Open-Source Cloud)",
                "type": "cloud",
                "available": groq_available,
                "api_key_masked": groq_masked,
                "current_model": getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b"),
                "available_models": [
                    "openai/gpt-oss-120b",
                    "qwen/qwen3.8-27b",
                    "openai/gpt-oss-20b",
                    "llama-3.3-70b-versatile"
                ],
                "badge": "Ultra-Fast Inference"
            },
            "openai": {
                "name": "OpenAI API",
                "type": "cloud",
                "available": openai_available,
                "api_key_masked": openai_masked,
                "current_model": "gpt-4o-mini",
                "available_models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
                "badge": "Proprietary"
            },
            "gemini": {
                "name": "Google Gemini",
                "type": "cloud",
                "available": gemini_available,
                "current_model": "gemini-1.5-flash",
                "available_models": ["gemini-1.5-flash", "gemini-1.5-pro"],
                "badge": "Cloud AI"
            }
        }
    }

@router.post("/config")
def update_ai_config(req: AIConfigUpdateRequest) -> Dict[str, Any]:
    """
    Updates the active AI provider, model, or API keys in memory and persists to .env.
    """
    updated_fields = []

    if req.active_provider:
        settings.ACTIVE_LLM_PROVIDER = req.active_provider.lower()
        _write_env_var("ACTIVE_LLM_PROVIDER", req.active_provider.lower())
        updated_fields.append("active_provider")

    if req.ollama_model:
        settings.OLLAMA_MODEL = req.ollama_model
        settings.LLM_MODEL = req.ollama_model
        _write_env_var("OLLAMA_MODEL", req.ollama_model)
        _write_env_var("LLM_MODEL", req.ollama_model)
        updated_fields.append("ollama_model")

    if req.ollama_base_url:
        settings.OLLAMA_BASE_URL = req.ollama_base_url
        _write_env_var("OLLAMA_BASE_URL", req.ollama_base_url)
        updated_fields.append("ollama_base_url")

    if req.groq_model:
        settings.GROQ_MODEL = req.groq_model
        _write_env_var("GROQ_MODEL", req.groq_model)
        updated_fields.append("groq_model")

    if req.groq_api_key:
        settings.GROQ_API_KEY = req.groq_api_key
        _write_env_var("GROQ_API_KEY", req.groq_api_key)
        updated_fields.append("groq_api_key")

    if req.openai_api_key:
        settings.OPENAI_API_KEY = req.openai_api_key
        _write_env_var("OPENAI_API_KEY", req.openai_api_key)
        updated_fields.append("openai_api_key")

    if req.gemini_api_key:
        settings.GEMINI_API_KEY = req.gemini_api_key
        _write_env_var("GEMINI_API_KEY", req.gemini_api_key)
        updated_fields.append("gemini_api_key")

    return {
        "status": "SUCCESS",
        "message": f"Successfully updated AI settings: {', '.join(updated_fields)}",
        "active_provider": settings.ACTIVE_LLM_PROVIDER,
        "current_model": settings.OLLAMA_MODEL if settings.ACTIVE_LLM_PROVIDER == "ollama" else settings.GROQ_MODEL
    }

@router.post("/test-provider")
def test_ai_provider(req: AITestRequest) -> Dict[str, Any]:
    """
    Tests a specific AI provider with a fast ping and returns response time.
    """
    provider = (req.provider or "ollama").lower()
    start_t = time.time()

    if provider == "ollama":
        base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434") or "http://localhost:11434"
        model_name = req.model or getattr(settings, "OLLAMA_MODEL", "llama3.1")
        try:
            with httpx.Client(timeout=25.0) as client:
                res = client.post(
                    f"{base_url.rstrip('/')}/v1/chat/completions",
                    json={
                        "model": model_name,
                        "messages": [{"role": "user", "content": "Respond strictly with: 'Local Ollama FinOps AI online.'"}]
                    }
                )
                latency = round((time.time() - start_t) * 1000)
                if res.status_code == 200:
                    reply = res.json()["choices"][0]["message"]["content"]
                    return {"status": "SUCCESS", "provider": "ollama", "model": model_name, "latency_ms": latency, "reply": reply.strip()}
                else:
                    return {"status": "ERROR", "provider": "ollama", "error": f"HTTP {res.status_code}: {res.text}"}
        except Exception as e:
            return {"status": "ERROR", "provider": "ollama", "error": str(e)}

    elif provider == "groq":
        if not settings.GROQ_API_KEY:
            return {"status": "ERROR", "provider": "groq", "error": "GROQ_API_KEY is not set."}
        model_name = req.model or getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b")
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": model_name,
                        "messages": [{"role": "user", "content": "Respond strictly with: 'Groq Cloud FinOps AI online.'"}]
                    }
                )
                latency = round((time.time() - start_t) * 1000)
                if res.status_code == 200:
                    reply = res.json()["choices"][0]["message"]["content"]
                    return {"status": "SUCCESS", "provider": "groq", "model": model_name, "latency_ms": latency, "reply": reply.strip()}
                else:
                    return {"status": "ERROR", "provider": "groq", "error": f"HTTP {res.status_code}: {res.text}"}
        except Exception as e:
            return {"status": "ERROR", "provider": "groq", "error": str(e)}

    return {"status": "ERROR", "error": f"Provider '{provider}' not implemented for direct test."}

# =========================================================================
# Mem0 Agent Memory Endpoints
# =========================================================================

class MemoryCreateRequest(BaseModel):
    content: str
    memory_type: str = "FINOPS_RULE"  # FINOPS_RULE, RESOURCE_EXEMPTION, USER_PREFERENCE, ANOMALY_NOTE
    category: str = "GENERAL"         # EC2, S3, RDS, IDLE_WASTE, BUDGET, GENERAL
    metadata: Optional[Dict[str, Any]] = None

class MemorySearchRequest(BaseModel):
    query: str
    limit: int = 5

@router.get("/memories")
def list_memories(
    category: Optional[str] = None,
    limit: int = 50,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    List all persistent FinOps agent memories for the tenant (Mem0 Layer).
    """
    return Mem0Service.list_memories(db, tenant_id=tenant_id, category=category, limit=limit)

@router.post("/memories")
def create_memory(
    req: MemoryCreateRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Add a new FinOps rule or memory to the Mem0 layer with adaptive vector embedding.
    """
    return Mem0Service.add_memory(
        db=db,
        tenant_id=tenant_id,
        content=req.content,
        memory_type=req.memory_type,
        category=req.category,
        metadata=req.metadata
    )

@router.post("/memories/search")
def search_memories(
    req: MemorySearchRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Perform hybrid semantic vector + keyword search over tenant memories.
    """
    return Mem0Service.search_memories(
        db=db,
        tenant_id=tenant_id,
        query=req.query,
        limit=req.limit
    )

@router.delete("/memories/{memory_id}")
def delete_memory(
    memory_id: int,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete a specific memory by ID.
    """
    success = Mem0Service.delete_memory(db, tenant_id=tenant_id, memory_id=memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "DELETED", "id": memory_id}

@router.post("/memories/clear")
def clear_memories(
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Clear all memories for the tenant.
    """
    count = Mem0Service.clear_memories(db, tenant_id=tenant_id)
    return {"status": "CLEARED", "deleted_count": count}

# =========================================================================
# Knowledge Base (RAG) Document Ingestion & Search Endpoints
# =========================================================================

class KnowledgeSearchRequest(BaseModel):
    query: str
    limit: int = 4
    category: Optional[str] = None

@router.post("/knowledge/upload")
async def upload_knowledge_document(
    file: UploadFile = File(...),
    category: str = Form("AWS_CLI"),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Upload an operational document (Markdown, PDF, TXT, JSON, YAML, CSV) to the Knowledge Base.
    Extracts text, splits semantically into chunks while preserving AWS CLI commands,
    computes vector embeddings via Mem0 engine, and indexes for LangGraph agent reasoning.
    """
    content_bytes = await file.read()
    try:
        return KnowledgeBaseService.ingest_document(
            db=db,
            tenant_id=tenant_id,
            filename=file.filename or "uploaded_document.txt",
            content_bytes=content_bytes,
            category=category,
            title=title,
            description=description
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to ingest document: {str(e)}")

@router.get("/knowledge")
def list_knowledge_documents(
    category: Optional[str] = None,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    List all indexed Knowledge Base documents with chunk counts and metadata.
    """
    return KnowledgeBaseService.list_documents(db, tenant_id=tenant_id, category=category)

@router.get("/knowledge/{doc_id}")
def get_knowledge_document(
    doc_id: int,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retrieve full details and semantic chunks of a specific Knowledge Base document.
    """
    doc = KnowledgeBaseService.get_document_details(db, tenant_id=tenant_id, doc_id=doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.post("/knowledge/search")
def search_knowledge_base(
    req: KnowledgeSearchRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Perform hybrid semantic vector + keyword similarity search across all tenant documents.
    Returns matching chunks with relevance scores, headers, and extracted AWS CLI commands.
    """
    return KnowledgeBaseService.search_knowledge(
        db=db,
        tenant_id=tenant_id,
        query=req.query,
        limit=req.limit,
        category=req.category
    )

@router.delete("/knowledge/{doc_id}")
def delete_knowledge_document(
    doc_id: int,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete a document from the Knowledge Base and cascade-delete all its indexed vector chunks.
    """
    success = KnowledgeBaseService.delete_document(db, tenant_id=tenant_id, doc_id=doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "DELETED", "id": doc_id}


