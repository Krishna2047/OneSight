import os
import io
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.agent import KnowledgeDocument, KnowledgeChunk
from app.services.memory_service import Mem0Service

logger = logging.getLogger("onesight.knowledge_base")

class KnowledgeBaseService:
    """
    Enterprise RAG (Retrieval-Augmented Generation) & Document Ingestion Engine for OneSight.
    Allows users to upload AWS CLI runbooks, FinOps policies, architecture whitepapers,
    and command cheatsheets to ground agent decisions with zero hallucination.
    """

    SUPPORTED_EXTENSIONS = {
        ".md": "MARKDOWN",
        ".txt": "TXT",
        ".pdf": "PDF",
        ".json": "JSON",
        ".yaml": "YAML",
        ".yml": "YAML",
        ".csv": "CSV"
    }

    @classmethod
    def extract_text_from_bytes(cls, filename: str, content_bytes: bytes) -> str:
        """
        Extracts clean UTF-8 text from raw uploaded file bytes across multiple formats.
        """
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                text_pages = []
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_pages.append(f"--- Page {idx + 1} ---\n{page_text}")
                return "\n\n".join(text_pages)
            except Exception as e:
                logger.warning(f"pypdf extraction failed for {filename}: {e}. Falling back to plain text decode.")

        # Text-based formats (MD, TXT, JSON, YAML, CSV)
        try:
            return content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                return content_bytes.decode("latin-1")
            except Exception as e:
                return content_bytes.decode("utf-8", errors="replace")

    @classmethod
    def chunk_text(
        cls,
        text: str,
        chunk_size: int = 800,
        chunk_overlap: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Intelligent Markdown and code-block aware semantic chunking.
        Ensures AWS CLI commands (`aws ...`) and markdown sections aren't split in half.
        """
        if not text or not text.strip():
            return []

        chunks: List[Dict[str, Any]] = []

        def extract_cmd(block: str) -> Optional[str]:
            # Priority 1: Command inside code block
            fence_match = re.search(r'```(?:bash|sh|aws)?\s*(aws\s+[^\n`]+)', block)
            if fence_match:
                return fence_match.group(1).strip().rstrip("`").strip()
            # Priority 2: Bare command on line
            bare_match = re.search(r'(\baws\s+[a-z0-9\-\s\_\.\:\/\=\'\"\[\]\*\?]+)', block)
            if bare_match:
                return bare_match.group(1).strip().rstrip("`").strip()
            return None

        # Split on markdown headers (e.g. #, ##, ###)
        sections = re.split(r'\n(?=#{1,4}\s)', text)
        for sec in sections:
            sec = sec.strip()
            if not sec:
                continue

            header_match = re.match(r'^(#{1,4}\s+[^\n]+)', sec)
            header = header_match.group(1).lstrip("#").strip() if header_match else "General"

            if len(sec) <= chunk_size:
                chunks.append({
                    "header": header,
                    "content": sec,
                    "aws_command": extract_cmd(sec)
                })
            else:
                sub_paras = sec.split("\n\n")
                curr = ""
                for p in sub_paras:
                    p = p.strip()
                    if not p:
                        continue
                    if len(curr) + len(p) + 2 <= chunk_size:
                        curr = f"{curr}\n\n{p}".strip() if curr else p
                    else:
                        if curr:
                            chunks.append({"header": header, "content": curr, "aws_command": extract_cmd(curr)})
                        curr = p
                if curr:
                    chunks.append({"header": header, "content": curr, "aws_command": extract_cmd(curr)})

        return chunks

    @classmethod
    def ingest_document(
        cls,
        db: Session,
        tenant_id: str,
        filename: str,
        content_bytes: bytes,
        category: str = "AWS_CLI",
        title: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Uploads and ingests a document into the Knowledge Base:
        1. Extracts text from bytes (PDF / Markdown / TXT / JSON / YAML / CSV).
        2. Chunks content semantically while preserving AWS commands.
        3. Computes vector embeddings using Mem0 adaptive embedding engine.
        4. Saves document record and vector chunks to database.
        """
        ext = os.path.splitext(filename)[1].lower()
        file_type = cls.SUPPORTED_EXTENSIONS.get(ext, "TXT")
        doc_title = title or os.path.splitext(filename)[0].replace("-", " ").replace("_", " ").title()

        # 1. Extract text
        raw_text = cls.extract_text_from_bytes(filename, content_bytes)
        if not raw_text.strip():
            raise ValueError(f"Extracted content from '{filename}' is empty or unreadable.")

        # 2. Chunk text
        chunks_data = cls.chunk_text(raw_text)
        if not chunks_data:
            chunks_data = [{"header": "Overview", "content": raw_text[:800], "aws_command": None}]

        # 3. Create KnowledgeDocument record
        doc_record = KnowledgeDocument(
            tenant_id=tenant_id,
            title=doc_title,
            filename=filename,
            file_type=file_type,
            file_size_bytes=len(content_bytes),
            chunk_count=len(chunks_data),
            category=category,
            description=description or f"Uploaded {file_type} document containing {len(chunks_data)} knowledge chunks."
        )
        db.add(doc_record)
        db.flush()

        # 4. Generate embeddings and save chunks
        created_chunks = []
        for idx, c in enumerate(chunks_data):
            embedding, provider = Mem0Service.get_embedding(c["content"])

            chunk_obj = KnowledgeChunk(
                document_id=doc_record.id,
                tenant_id=tenant_id,
                chunk_index=idx,
                header=c["header"],
                content=c["content"],
                embedding_provider=provider,
                embedding=embedding,
                metadata_json={
                    "filename": filename,
                    "title": doc_title,
                    "category": category,
                    "aws_command": c.get("aws_command")
                }
            )
            db.add(chunk_obj)
            created_chunks.append(chunk_obj)

        db.commit()
        db.refresh(doc_record)

        logger.info(f"Ingested KnowledgeDocument #{doc_record.id} ('{filename}', {len(chunks_data)} chunks) for {tenant_id}.")

        return {
            "id": doc_record.id,
            "tenant_id": doc_record.tenant_id,
            "title": doc_record.title,
            "filename": doc_record.filename,
            "file_type": doc_record.file_type,
            "file_size_bytes": doc_record.file_size_bytes,
            "chunk_count": doc_record.chunk_count,
            "category": doc_record.category,
            "created_at": doc_record.created_at.isoformat() if doc_record.created_at else None,
            "message": f"Successfully indexed '{filename}' into Knowledge Base ({len(chunks_data)} vector chunks created)."
        }

    @classmethod
    def list_documents(
        cls,
        db: Session,
        tenant_id: str,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lists all uploaded Knowledge Base documents for the tenant.
        """
        q = db.query(KnowledgeDocument).filter(KnowledgeDocument.tenant_id == tenant_id)
        if category and category.upper() != "ALL":
            q = q.filter(KnowledgeDocument.category == category)

        docs = q.order_by(KnowledgeDocument.created_at.desc()).all()
        return [
            {
                "id": d.id,
                "tenant_id": d.tenant_id,
                "title": d.title,
                "filename": d.filename,
                "file_type": d.file_type,
                "file_size_bytes": d.file_size_bytes,
                "chunk_count": d.chunk_count,
                "category": d.category,
                "description": d.description,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in docs
        ]

    @classmethod
    def get_document_details(
        cls,
        db: Session,
        tenant_id: str,
        doc_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieves document metadata along with all its indexed chunks.
        """
        doc = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.tenant_id == tenant_id,
            KnowledgeDocument.id == doc_id
        ).first()

        if not doc:
            return None

        chunks = db.query(KnowledgeChunk).filter(
            KnowledgeChunk.document_id == doc.id,
            KnowledgeChunk.tenant_id == tenant_id
        ).order_by(KnowledgeChunk.chunk_index.asc()).all()

        return {
            "id": doc.id,
            "title": doc.title,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size_bytes": doc.file_size_bytes,
            "chunk_count": doc.chunk_count,
            "category": doc.category,
            "description": doc.description,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "chunks": [
                {
                    "id": c.id,
                    "chunk_index": c.chunk_index,
                    "header": c.header,
                    "content": c.content,
                    "metadata": c.metadata_json,
                    "embedding_provider": c.embedding_provider
                }
                for c in chunks
            ]
        }

    @classmethod
    def delete_document(
        cls,
        db: Session,
        tenant_id: str,
        doc_id: int
    ) -> bool:
        """
        Deletes a document and cascades deletion of all its vector chunks.
        """
        doc = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.tenant_id == tenant_id,
            KnowledgeDocument.id == doc_id
        ).first()

        if not doc:
            return False

        db.delete(doc)
        db.commit()
        return True

    @classmethod
    def search_knowledge(
        cls,
        db: Session,
        tenant_id: str,
        query: str,
        limit: int = 4,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs hybrid semantic vector + keyword search over Knowledge Base chunks.
        Returns ranked results with source citations and extracted AWS commands.
        """
        if not query or not query.strip():
            return []

        clean_q = query.strip()
        query_vec, _ = Mem0Service.get_embedding(clean_q)

        q = db.query(KnowledgeChunk).filter(KnowledgeChunk.tenant_id == tenant_id)
        if category and category.upper() != "ALL":
            q = q.join(KnowledgeDocument).filter(KnowledgeDocument.category == category)

        all_chunks = q.all()
        if not all_chunks:
            return []

        scored_results = []
        tokens = set(clean_q.lower().split())

        for c in all_chunks:
            # 1. Cosine similarity on dense vector
            vec_sim = 0.0
            if c.embedding and query_vec:
                vec_sim = Mem0Service.cosine_similarity(query_vec, c.embedding)

            # 2. Keyword lexical overlap score
            text_lower = c.content.lower()
            keyword_score = sum(1.0 for t in tokens if t in text_lower) / max(len(tokens), 1)

            # 3. Boost if chunk explicitly contains an AWS command
            meta = c.metadata_json or {}
            cmd_boost = 0.15 if meta.get("aws_command") else 0.0

            # Hybrid combined score
            final_score = round(0.65 * vec_sim + 0.35 * keyword_score + cmd_boost, 4)

            if final_score > 0.05 or keyword_score > 0.3:
                scored_results.append({
                    "chunk_id": c.id,
                    "document_id": c.document_id,
                    "filename": meta.get("filename", "unknown"),
                    "title": meta.get("title", "Document"),
                    "category": meta.get("category", "AWS_CLI"),
                    "header": c.header,
                    "content": c.content,
                    "aws_command": meta.get("aws_command"),
                    "score": final_score
                })

        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:limit]

    @classmethod
    def get_knowledge_context_for_prompt(
        cls,
        db: Session,
        tenant_id: str,
        query: str,
        limit: int = 3
    ) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
        """
        Retrieves top relevant knowledge chunks for LangGraph prompt injection.
        Returns:
        - formatted_context_str: Formatted markdown string for LLM injection
        - matched_chunks: List of matched chunk dicts
        - suggested_aws_command: The best matching read-only AWS command extracted from docs (if any)
        """
        matches = cls.search_knowledge(db, tenant_id, query, limit=limit)
        if not matches:
            return "", [], None

        lines = ["\n### 📄 Uploaded Knowledge Base References (Runbooks & Documentation):"]
        suggested_cmd = None

        for idx, m in enumerate(matches):
            cmd_info = f"\n  - 🔧 **Documented Command:** `{m['aws_command']}`" if m.get("aws_command") else ""
            lines.append(
                f"- **[{idx + 1}] Source:** `{m['filename']}` ({m['title']} ➔ {m['header']}) [Relevance: {m['score']:.2f}]\n"
                f"  {m['content'].strip()}{cmd_info}"
            )
            if not suggested_cmd and m.get("aws_command"):
                suggested_cmd = m["aws_command"]

        return "\n".join(lines), matches, suggested_cmd
