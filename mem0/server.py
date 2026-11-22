import os
import re
import json
import sqlite3
import hashlib
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import httpx
import numpy as np
from fastapi import FastAPI, HTTPException, Header, Query
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mem0-server")

DB_DIR = os.getenv("DATA_DIR")
if DB_DIR:
    try:
        os.makedirs(DB_DIR, exist_ok=True)
    except Exception:
        DB_DIR = None

if not DB_DIR or not os.path.exists(DB_DIR):
    DB_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(DB_DIR, "mem0.db")

app = FastAPI(
    title="Mem0 Standalone Microservice",
    description="Standalone Agent Memory & Semantic Vector Service for Multi-Tenant OneSight Platform",
    version="1.0.0"
)

# -------------------------------------------------------------------------
# Database Storage (SQLite persistent file)
# -------------------------------------------------------------------------

def get_db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_conn()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                user_id TEXT DEFAULT 'admin',
                memory_type TEXT NOT NULL,
                category TEXT DEFAULT 'GENERAL',
                content TEXT NOT NULL,
                embedding_provider TEXT,
                embedding TEXT,
                metadata_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tenant ON memories(tenant_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON memories(category);")
    conn.close()

# -------------------------------------------------------------------------
# Vector Embedding Engine
# -------------------------------------------------------------------------

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

def compute_dense_cpu_vector(text: str, dimensions: int = 128) -> List[float]:
    vec = np.zeros(dimensions, dtype=np.float32)
    clean_text = re.sub(r"[^\w\s-]", " ", text.lower())
    tokens = [t for t in clean_text.split() if len(t) > 1]
    
    all_features = list(tokens)
    for token in tokens:
        if len(token) >= 3:
            for i in range(len(token) - 2):
                all_features.append(token[i:i+3])
    
    if not all_features:
        return vec.tolist()

    for feat in all_features:
        h = hashlib.md5(feat.encode("utf-8")).hexdigest()
        idx = int(h[:8], 16) % dimensions
        sign = 1.0 if int(h[8:10], 16) % 2 == 0 else -1.0
        vec[idx] += sign

    norm = np.linalg.norm(vec)
    if norm > 1e-9:
        vec = vec / norm

    return vec.tolist()

def get_embedding(text: str) -> Tuple[List[float], str]:
    # 1. Try Ollama (nomic-embed-text)
    if OLLAMA_BASE_URL:
        try:
            with httpx.Client(timeout=1.5) as client:
                resp = client.post(
                    f"{OLLAMA_BASE_URL}/api/embeddings",
                    json={"model": "nomic-embed-text", "prompt": text}
                )
                if resp.status_code == 200:
                    emb = resp.json().get("embedding")
                    if emb and isinstance(emb, list):
                        return emb, "ollama:nomic-embed-text"
        except Exception:
            pass

    # 2. Try OpenAI
    if OPENAI_API_KEY:
        try:
            with httpx.Client(timeout=3.0) as client:
                resp = client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                    json={"input": text, "model": "text-embedding-3-small"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    emb = data["data"][0]["embedding"]
                    return emb, "openai:text-embedding-3-small"
        except Exception:
            pass

    # 3. Built-in CPU dense vectorizer fallback
    return compute_dense_cpu_vector(text), "hybrid-cpu-dense"

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-9 or norm_b < 1e-9:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

def seed_default_memories(tenant_id: str):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM memories WHERE tenant_id = ?", (tenant_id,))
    count = cur.fetchone()[0]
    if count == 0:
        logger.info(f"Seeding default FinOps team memories for tenant {tenant_id}...")
        seeds = [
            ("RESOURCE_EXEMPTION", "IDLE_WASTE", "Volume vol-0a882a6f (MongoDB DR Standby in us-east-1) is intentionally unattached for cross-region failover. Do not remediate or flag as idle waste.", {"resource_id": "vol-0a882a6f"}),
            ("FINOPS_RULE", "BUDGET", "Target monthly organizational AWS spend ceiling is set at $15,000. Warn immediately if rolling burn rate projects higher than $15,000.", {"budget_limit": 15000}),
            ("USER_PREFERENCE", "EC2", "For compute optimizations, recommend 1-Year No Upfront or All Upfront AWS Compute Savings Plans before suggesting instance resizing.", {"preference": "SAVINGS_PLANS"})
        ]
        for m_type, cat, content, meta in seeds:
            emb, prov = get_embedding(content)
            cur.execute("""
                INSERT INTO memories (tenant_id, user_id, memory_type, category, content, embedding_provider, embedding, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (tenant_id, "admin", m_type, cat, content, prov, json.dumps(emb), json.dumps(meta), datetime.now(timezone.utc).isoformat()))
        conn.commit()
    conn.close()

init_db()
seed_default_memories("tenant-acme")

# -------------------------------------------------------------------------
# Request Models
# -------------------------------------------------------------------------

class MemoryCreate(BaseModel):
    content: str
    tenant_id: Optional[str] = "tenant-acme"
    user_id: Optional[str] = "admin"
    memory_type: str = "FINOPS_RULE"
    category: str = "GENERAL"
    metadata: Optional[Dict[str, Any]] = None

class MemorySearch(BaseModel):
    query: str
    tenant_id: Optional[str] = "tenant-acme"
    limit: int = 5
    threshold: float = 0.12

# -------------------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "onesight-mem0-standalone",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ollama_endpoint": OLLAMA_BASE_URL,
        "database": DB_PATH
    }

@app.get("/v1/memories")
def list_memories(
    tenant_id: str = "tenant-acme",
    category: Optional[str] = None,
    limit: int = 50
):
    conn = get_db_conn()
    cur = conn.cursor()
    if category and category.upper() != "ALL":
        cur.execute("SELECT * FROM memories WHERE tenant_id = ? AND category = ? ORDER BY created_at DESC LIMIT ?", (tenant_id, category.upper(), limit))
    else:
        cur.execute("SELECT * FROM memories WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?", (tenant_id, limit))
    rows = cur.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "tenant_id": r["tenant_id"],
            "user_id": r["user_id"],
            "memory_type": r["memory_type"],
            "category": r["category"],
            "content": r["content"],
            "embedding_provider": r["embedding_provider"],
            "metadata": json.loads(r["metadata_json"]) if r["metadata_json"] else {},
            "created_at": r["created_at"]
        }
        for r in rows
    ]

@app.post("/v1/memories")
def create_memory(req: MemoryCreate):
    emb, provider = get_embedding(req.content)
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO memories (tenant_id, user_id, memory_type, category, content, embedding_provider, embedding, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.tenant_id,
        req.user_id,
        req.memory_type,
        req.category,
        req.content.strip(),
        provider,
        json.dumps(emb),
        json.dumps(req.metadata or {}),
        now_iso
    ))
    mem_id = cur.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": mem_id,
        "tenant_id": req.tenant_id,
        "user_id": req.user_id,
        "memory_type": req.memory_type,
        "category": req.category,
        "content": req.content.strip(),
        "embedding_provider": provider,
        "metadata": req.metadata or {},
        "created_at": now_iso
    }

@app.post("/v1/memories/search")
def search_memories(req: MemorySearch):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM memories WHERE tenant_id = ?", (req.tenant_id,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return []

    query_emb, _ = get_embedding(req.query)
    query_lower = req.query.lower()
    query_words = set(re.findall(r"\b[a-zA-Z0-9_\-]+\b", query_lower))

    results = []
    for r in rows:
        stored_emb = json.loads(r["embedding"]) if r["embedding"] else []
        sim = 0.0
        if len(stored_emb) == len(query_emb):
            sim = cosine_similarity(query_emb, stored_emb)
        else:
            fallback_q = compute_dense_cpu_vector(req.query)
            fallback_m = compute_dense_cpu_vector(r["content"])
            sim = cosine_similarity(fallback_q, fallback_m)

        content_lower = r["content"].lower()
        overlap_count = sum(1 for w in query_words if len(w) > 3 and w in content_lower)
        boost = min(0.4, overlap_count * 0.15)

        cat = (r["category"] or "").upper()
        if cat == "IDLE_WASTE" and any(k in query_lower for k in ["idle", "waste", "ebs", "volume", "unused", "unattached", "disk"]):
            boost += 0.35
        elif cat == "BUDGET" and any(k in query_lower for k in ["budget", "forecast", "spend", "cost", "ceiling", "limit", "burn"]):
            boost += 0.35
        elif cat == "EC2" and any(k in query_lower for k in ["ec2", "compute", "instance", "savings", "reserved"]):
            boost += 0.35

        meta = json.loads(r["metadata_json"]) if r["metadata_json"] else {}
        res_id = (meta.get("resource_id") or "").lower()
        if res_id and res_id in query_lower:
            boost += 0.5

        total_score = float(sim + boost)
        if total_score >= req.threshold or boost > 0.3:
            results.append({
                "id": r["id"],
                "tenant_id": r["tenant_id"],
                "memory_type": r["memory_type"],
                "category": r["category"],
                "content": r["content"],
                "embedding_provider": r["embedding_provider"],
                "metadata": meta,
                "score": round(total_score, 3),
                "created_at": r["created_at"]
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:req.limit]

@app.delete("/v1/memories/{memory_id}")
def delete_memory(memory_id: int, tenant_id: str = "tenant-acme"):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM memories WHERE id = ? AND tenant_id = ?", (memory_id, tenant_id))
    rows_affected = cur.rowcount
    conn.commit()
    conn.close()
    if rows_affected == 0:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "DELETED", "id": memory_id}

@app.post("/v1/memories/clear")
def clear_memories(tenant_id: str = "tenant-acme"):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM memories WHERE tenant_id = ?", (tenant_id,))
    rows_affected = cur.rowcount
    conn.commit()
    conn.close()
    return {"status": "CLEARED", "deleted_count": rows_affected}
