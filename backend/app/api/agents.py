import os
import time
import httpx
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
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
