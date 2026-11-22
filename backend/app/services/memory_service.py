import re
import math
import hashlib
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import httpx
import numpy as np
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.agent import AgentMemory

logger = logging.getLogger("onesight.mem0")

class Mem0Service:
    """
    Production-Grade Multi-Tenant Agent Memory Engine (Mem0 Architecture).
    Features:
    1. Adaptive Embeddings:
       - Ollama (nomic-embed-text / llama3.1) if running locally.
       - OpenAI (text-embedding-3-small) if API key configured.
       - In-process dense CPU Hash Vectorizer (100% self-contained, runs anywhere, zero external deps).
    2. Multi-Tenant Partitioning:
       - All queries strictly filtered by tenant_id.
    3. Episodic Fact Extraction & Exemption Management.
    4. Fast Cosine Similarity Vector Search + Hybrid Token Overlap.
    """

    DEFAULT_SEED_MEMORIES = [
        {
            "memory_type": "RESOURCE_EXEMPTION",
            "category": "IDLE_WASTE",
            "content": "Volume vol-0a882a6f (MongoDB DR Standby in us-east-1) is intentionally unattached for cross-region failover. Do not remediate or flag as idle waste.",
            "metadata_json": {"resource_id": "vol-0a882a6f", "service": "EC2", "reason": "DR_STANDBY"}
        },
        {
            "memory_type": "FINOPS_RULE",
            "category": "BUDGET",
            "content": "Target monthly organizational AWS spend ceiling is set at $15,000. Warn immediately if rolling burn rate projects higher than $15,000.",
            "metadata_json": {"budget_limit": 15000, "currency": "USD"}
        },
        {
            "memory_type": "USER_PREFERENCE",
            "category": "EC2",
            "content": "For compute optimizations, recommend 1-Year No Upfront or All Upfront AWS Compute Savings Plans before suggesting instance resizing.",
            "metadata_json": {"preference_type": "SAVINGS_PLANS"}
        }
    ]

    @classmethod
    def _call_standalone_mem0(cls, method: str, endpoint: str, **kwargs) -> Optional[Any]:
        """
        Attempts to communicate with the standalone Mem0 Docker service container.
        """
        mem0_base = getattr(settings, "MEM0_URL", None)
        if not mem0_base:
            return None
        try:
            with httpx.Client(timeout=2.0) as client:
                res = client.request(method, f"{mem0_base.rstrip('/')}{endpoint}", **kwargs)
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
        return None

    # -------------------------------------------------------------------------
    # 1. Embeddings Pipeline (Adaptive Multi-Tenant Provider)
    # -------------------------------------------------------------------------

    @classmethod
    def compute_dense_cpu_vector(cls, text: str, dimensions: int = 128) -> List[float]:
        """
        Deterministic, in-process CPU dense feature vectorizer (Signed Feature Hashing).
        Requires zero network, zero external servers, and zero heavy model weights.
        Produces normalized vectors suitable for cosine similarity.
        """
        vec = np.zeros(dimensions, dtype=np.float32)
        clean_text = re.sub(r"[^\w\s-]", " ", text.lower())
        tokens = [t for t in clean_text.split() if len(t) > 1]
        
        # Word tokens + Character 3-grams
        all_features = list(tokens)
        for token in tokens:
            if len(token) >= 3:
                for i in range(len(token) - 2):
                    all_features.append(token[i:i+3])
        
        if not all_features:
            return vec.tolist()

        # Feature hashing with sign hash
        for feat in all_features:
            h = hashlib.md5(feat.encode("utf-8")).hexdigest()
            idx = int(h[:8], 16) % dimensions
            sign = 1.0 if int(h[8:10], 16) % 2 == 0 else -1.0
            vec[idx] += sign

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec = vec / norm

        return vec.tolist()

    @classmethod
    def get_embedding(cls, text: str) -> Tuple[List[float], str]:
        """
        Calculates vector embedding using the best available provider for the tenant:
        1. Ollama (nomic-embed-text) if local daemon is running.
        2. OpenAI (text-embedding-3-small) if OPENAI_API_KEY is present.
        3. Built-in CPU Vectorizer (guaranteed fallback for all tenants).
        """
        # Try Ollama if configured
        ollama_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        try:
            with httpx.Client(timeout=1.5) as client:
                resp = client.post(
                    f"{ollama_url}/api/embeddings",
                    json={"model": "nomic-embed-text", "prompt": text}
                )
                if resp.status_code == 200:
                    emb = resp.json().get("embedding")
                    if emb and isinstance(emb, list):
                        return emb, "ollama:nomic-embed-text"
        except Exception:
            pass  # Ollama not available or model not pulled; smoothly fall through

        # Try OpenAI if API key available
        if getattr(settings, "OPENAI_API_KEY", None):
            try:
                base_url = (getattr(settings, "OPENAI_BASE_URL", None) or "https://api.openai.com/v1").rstrip("/")
                with httpx.Client(timeout=3.0) as client:
                    resp = client.post(
                        f"{base_url}/embeddings",
                        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                        json={"input": text, "model": "text-embedding-3-small"}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        emb = data["data"][0]["embedding"]
                        return emb, "openai:text-embedding-3-small"
            except Exception:
                pass

        # Built-in CPU vectorizer fallback (instant, 100% reliable)
        cpu_vec = cls.compute_dense_cpu_vector(text)
        return cpu_vec, "hybrid-cpu-dense"

    # Alias for embedding calculation
    compute_embedding = get_embedding

    # -------------------------------------------------------------------------
    # 2. Similarity & Search
    # -------------------------------------------------------------------------

    @classmethod
    def cosine_similarity(cls, vec_a: List[float], vec_b: List[float]) -> float:
        """
        Computes cosine similarity between two float vectors.
        """
        if not vec_a or not vec_b:
            return 0.0
        if len(vec_a) != len(vec_b):
            return 0.0  # Different embedding models, cannot dot-product directly

        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a < 1e-9 or norm_b < 1e-9:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    @classmethod
    def search_memories(
        cls,
        db: Session,
        tenant_id: str,
        query: str,
        limit: int = 5,
        threshold: float = 0.15
    ) -> List[Dict[str, Any]]:
        """
        Hybrid Semantic + Keyword Search for tenant memories:
        - Tries standalone Mem0 Docker container service first.
        - Calculates cosine similarity against stored vectors.
        - Adds keyword boosting for matching AWS resource IDs (vol-, i-, arn:) and service tags.
        """
        # Try standalone Mem0 microservice container
        remote = cls._call_standalone_mem0("POST", "/v1/memories/search", json={
            "query": query, "tenant_id": tenant_id, "limit": limit, "threshold": threshold
        })
        if remote is not None and isinstance(remote, list) and len(remote) > 0:
            return remote

        cls.seed_if_empty(db, tenant_id)

        all_memories = db.query(AgentMemory).filter(
            AgentMemory.tenant_id == tenant_id
        ).all()

        if not all_memories:
            return []

        query_emb, _ = cls.get_embedding(query)
        query_lower = query.lower()
        query_words = set(re.findall(r"\b[a-zA-Z0-9_\-]+\b", query_lower))

        results = []
        for mem in all_memories:
            sim = 0.0
            if mem.embedding and isinstance(mem.embedding, list):
                if len(mem.embedding) == len(query_emb):
                    sim = cls.cosine_similarity(query_emb, mem.embedding)
                else:
                    # Compare using CPU dense vector if different models
                    fallback_query_vec = cls.compute_dense_cpu_vector(query)
                    fallback_mem_vec = cls.compute_dense_cpu_vector(mem.content)
                    sim = cls.cosine_similarity(fallback_query_vec, fallback_mem_vec)
            else:
                fallback_query_vec = cls.compute_dense_cpu_vector(query)
                fallback_mem_vec = cls.compute_dense_cpu_vector(mem.content)
                sim = cls.cosine_similarity(fallback_query_vec, fallback_mem_vec)

            # Keyword & Entity overlap boost
            content_lower = mem.content.lower()
            overlap_count = sum(1 for w in query_words if len(w) > 3 and w in content_lower)
            boost = min(0.4, overlap_count * 0.15)

            # Category relevance boost
            cat = (mem.category or "").upper()
            if cat == "IDLE_WASTE" and any(k in query_lower for k in ["idle", "waste", "ebs", "volume", "unused", "unattached", "disk"]):
                boost += 0.35
            elif cat == "BUDGET" and any(k in query_lower for k in ["budget", "forecast", "spend", "cost", "ceiling", "limit", "burn"]):
                boost += 0.35
            elif cat == "EC2" and any(k in query_lower for k in ["ec2", "compute", "instance", "savings", "reserved", "c5", "t3"]):
                boost += 0.35
            elif cat == "S3" and any(k in query_lower for k in ["s3", "storage", "bucket", "lifecycle", "glacier"]):
                boost += 0.35

            # Extra boost for exact AWS resource ID matches (e.g. vol-0a882a6f)
            meta = mem.metadata_json or {}
            res_id = meta.get("resource_id", "").lower()
            if res_id and res_id in query_lower:
                boost += 0.5

            total_score = float(sim + boost)

            if total_score >= threshold or boost > 0.3:
                results.append({
                    "id": mem.id,
                    "tenant_id": mem.tenant_id,
                    "memory_type": mem.memory_type,
                    "category": mem.category,
                    "content": mem.content,
                    "metadata": mem.metadata_json,
                    "embedding_provider": mem.embedding_provider,
                    "score": round(total_score, 3),
                    "created_at": mem.created_at.isoformat() if mem.created_at else None
                })

        # Sort by total score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    # -------------------------------------------------------------------------
    # 3. Context Injection for Agent Prompts
    # -------------------------------------------------------------------------

    @classmethod
    def get_context_for_prompt(cls, db: Session, tenant_id: str, query: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Retrieves relevant memories and formats them as a clean markdown block for agent injection.
        """
        matches = cls.search_memories(db, tenant_id, query, limit=3, threshold=0.12)
        if not matches:
            return "", []

        lines = [
            "--- ACTIVE ORGANIZATIONAL MEMORIES & FINOPS RULES (Mem0 Layer) ---",
            "The following team rules, preferences, and resource exemptions MUST be respected:"
        ]
        for m in matches:
            lines.append(f"• [{m['memory_type']}] ({m['category']}): {m['content']}")
        lines.append("-------------------------------------------------------------------")

        return "\n".join(lines), matches

    # -------------------------------------------------------------------------
    # 4. Memory Fact Extraction & Direct Management
    # -------------------------------------------------------------------------

    @classmethod
    def extract_fact_directive(cls, text: str) -> Optional[Dict[str, Any]]:
        """
        Detects if a user message is an explicit memory or rule instruction:
        e.g. "Remember that vol-0a88 is a backup disk", "Note: our budget cap is $15,000"
        """
        t = text.strip()
        lower = t.lower()

        patterns = [
            r"^remember\s+that\s+(.*)",
            r"^remember\s*:\s*(.*)",
            r"^note\s+that\s+(.*)",
            r"^note\s*:\s*(.*)",
            r"^save\s+rule\s*:\s*(.*)",
            r"^finops\s+rule\s*:\s*(.*)",
            r"^exemption\s*:\s*(.*)",
            r"^do\s+not\s+(flag|delete|terminate|alert)\s+(.*)",
            r"^don\'t\s+(flag|delete|terminate|alert)\s+(.*)"
        ]

        extracted_content = None
        for p in patterns:
            match = re.match(p, lower, re.IGNORECASE)
            if match:
                extracted_content = t[match.start(1):].strip() if match.lastindex >= 1 else t
                break

        if not extracted_content:
            return None

        # Determine category & memory_type
        category = "GENERAL"
        memory_type = "FINOPS_RULE"
        metadata = {}

        if any(w in lower for w in ["vol-", "ebs", "volume", "snapshot", "unattached", "idle"]):
            category = "IDLE_WASTE"
            memory_type = "RESOURCE_EXEMPTION"
            vol_match = re.search(r"\b(vol-[a-f0-9]{8,17})\b", lower)
            if vol_match:
                metadata["resource_id"] = vol_match.group(1)
        elif any(w in lower for w in ["budget", "forecast", "ceiling", "limit", "spend cap"]):
            category = "BUDGET"
            memory_type = "FINOPS_RULE"
        elif any(w in lower for w in ["ec2", "instance", "savings plans", "reserved"]):
            category = "EC2"
            memory_type = "USER_PREFERENCE"
        elif any(w in lower for w in ["s3", "bucket", "lifecycle"]):
            category = "S3"
            memory_type = "FINOPS_RULE"

        return {
            "content": extracted_content,
            "category": category,
            "memory_type": memory_type,
            "metadata": metadata
        }

    @classmethod
    def add_memory(
        cls,
        db: Session,
        tenant_id: str,
        content: str,
        memory_type: str = "FINOPS_RULE",
        category: str = "GENERAL",
        metadata: Optional[Dict[str, Any]] = None,
        user_id: str = "admin"
    ) -> Dict[str, Any]:
        """
        Stores a new memory, generates its embedding, and saves to database.
        """
        emb, provider = cls.get_embedding(content)

        mem = AgentMemory(
            tenant_id=tenant_id,
            user_id=user_id,
            memory_type=memory_type,
            category=category,
            content=content.strip(),
            embedding=emb,
            embedding_provider=provider,
            metadata_json=metadata or {},
            created_at=datetime.now(timezone.utc)
        )
        db.add(mem)
        db.commit()
        db.refresh(mem)

        # Also forward to standalone Mem0 container if running
        cls._call_standalone_mem0("POST", "/v1/memories", json={
            "content": content.strip(),
            "tenant_id": tenant_id,
            "user_id": user_id,
            "memory_type": memory_type,
            "category": category,
            "metadata": metadata
        })

        return {
            "id": mem.id,
            "tenant_id": mem.tenant_id,
            "memory_type": mem.memory_type,
            "category": mem.category,
            "content": mem.content,
            "embedding_provider": mem.embedding_provider,
            "metadata": mem.metadata_json,
            "created_at": mem.created_at.isoformat() if mem.created_at else None
        }

    @classmethod
    def list_memories(cls, db: Session, tenant_id: str, category: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        # Check standalone Mem0 container first
        cat_param = f"&category={category}" if category and category.upper() != "ALL" else ""
        remote = cls._call_standalone_mem0("GET", f"/v1/memories?tenant_id={tenant_id}{cat_param}&limit={limit}")
        if remote is not None and isinstance(remote, list) and len(remote) > 0:
            return remote

        cls.seed_if_empty(db, tenant_id)

        query = db.query(AgentMemory).filter(AgentMemory.tenant_id == tenant_id)
        if category and category.upper() != "ALL":
            query = query.filter(AgentMemory.category == category.upper())

        memories = query.order_by(AgentMemory.created_at.desc()).limit(limit).all()

        return [
            {
                "id": m.id,
                "tenant_id": m.tenant_id,
                "memory_type": m.memory_type,
                "category": m.category,
                "content": m.content,
                "embedding_provider": m.embedding_provider,
                "metadata": m.metadata_json,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in memories
        ]

    @classmethod
    def delete_memory(cls, db: Session, tenant_id: str, memory_id: int) -> bool:
        cls._call_standalone_mem0("DELETE", f"/v1/memories/{memory_id}?tenant_id={tenant_id}")
        mem = db.query(AgentMemory).filter(
            AgentMemory.tenant_id == tenant_id,
            AgentMemory.id == memory_id
        ).first()
        if not mem:
            return False
        db.delete(mem)
        db.commit()
        return True

    @classmethod
    def clear_memories(cls, db: Session, tenant_id: str) -> int:
        cls._call_standalone_mem0("POST", f"/v1/memories/clear?tenant_id={tenant_id}")
        count = db.query(AgentMemory).filter(AgentMemory.tenant_id == tenant_id).delete()
        db.commit()
        return count

    @classmethod
    def seed_if_empty(cls, db: Session, tenant_id: str) -> None:
        count = db.query(AgentMemory).filter(AgentMemory.tenant_id == tenant_id).count()
        if count == 0:
            logger.info(f"Seeding default FinOps memories for tenant '{tenant_id}'...")
            for seed in cls.DEFAULT_SEED_MEMORIES:
                emb, provider = cls.get_embedding(seed["content"])
                db.add(AgentMemory(
                    tenant_id=tenant_id,
                    user_id="admin",
                    memory_type=seed["memory_type"],
                    category=seed["category"],
                    content=seed["content"],
                    embedding=emb,
                    embedding_provider=provider,
                    metadata_json=seed.get("metadata_json", {}),
                    created_at=datetime.now(timezone.utc)
                ))
            db.commit()
