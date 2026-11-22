import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal, Base, engine
from app.services.knowledge_service import KnowledgeBaseService
from app.services.langgraph_agent import LangGraphFinOpsEngine
from app.models.agent import KnowledgeDocument, KnowledgeChunk

def test_knowledge_base_pipeline():
    print("=================================================================")
    print("🧪 OneSight Knowledge Base (RAG) Document Ingestion Test Suite")
    print("=================================================================")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    tenant_id = "tenant-acme"
    sample_filename = "aws-s3-finops-playbook.md"
    sample_content = b"""# AWS S3 FinOps Optimization & Inspection Runbook

## S3 Bucket Inventory Audit
To inspect all production buckets across your AWS account, run the following read-only inspection:
```bash
aws s3api list-buckets --query "Buckets[*].[Name,CreationDate]"
```

## S3 Lifecycle Expiration Rules
To verify which buckets have automated transitions to Glacier Flexible Retrieval or Deep Archive:
```bash
aws s3api get-bucket-lifecycle-configuration --bucket onesight-analytics-prod
```
Ensure all buckets with non-current object versions have a 30-day expiration policy enabled to prevent runaway storage charges.

## S3 Intelligent-Tiering Verification
Check if Archive Access Tier and Deep Archive Access Tier are active on the data lake:
```bash
aws s3api get-bucket-intelligent-tiering-configuration --bucket onesight-datalake
```
"""

    try:
        # 1. Clean any previous test document
        existing = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.tenant_id == tenant_id,
            KnowledgeDocument.filename == sample_filename
        ).all()
        for doc in existing:
            KnowledgeBaseService.delete_document(db, tenant_id, doc.id)

        # 2. Ingest Document
        print("\n--- Test 1: Ingesting Markdown Runbook & Semantic Chunking ---")
        doc_res = KnowledgeBaseService.ingest_document(
            db=db,
            tenant_id=tenant_id,
            filename=sample_filename,
            content_bytes=sample_content,
            category="AWS_CLI",
            title="S3 FinOps Runbook",
            description="Operational runbook for S3 inventory, lifecycle audits, and Intelligent-Tiering verification."
        )
        assert doc_res["id"] is not None
        assert doc_res["chunk_count"] >= 2
        print(f"  [PASS] Successfully indexed '{sample_filename}' (Created {doc_res['chunk_count']} vector chunks).")

        # 3. List Documents
        print("\n--- Test 2: Listing Knowledge Base Documents ---")
        docs = KnowledgeBaseService.list_documents(db, tenant_id)
        assert any(d["filename"] == sample_filename for d in docs)
        print(f"  [PASS] Found {len(docs)} document(s) in tenant knowledge library.")

        # 4. Hybrid Semantic Vector Search
        print("\n--- Test 3: Hybrid Semantic Search for AWS Commands ---")
        search_query = "how to check lifecycle configuration on S3 bucket"
        results = KnowledgeBaseService.search_knowledge(db, tenant_id, search_query, limit=2)
        assert len(results) > 0
        top_match = results[0]
        assert "get-bucket-lifecycle-configuration" in (top_match.get("aws_command") or top_match.get("content"))
        print(f"  [PASS] Top match: '{top_match['header']}' from '{top_match['filename']}' (Score: {top_match['score']:.2f}).")
        print(f"  Extracted AWS command: {top_match.get('aws_command')}")

        # 5. LangGraph RAG Integration
        print("\n--- Test 4: LangGraph Agent RAG Grounding ---")
        agent_res = LangGraphFinOpsEngine.run(
            db,
            "According to our runbook, how do we audit S3 bucket lifecycle?",
            tenant_id=tenant_id
        )
        assert len(agent_res.get("recalled_knowledge", [])) > 0
        print(f"  [PASS] Agent recalled {len(agent_res['recalled_knowledge'])} knowledge document(s).")
        print(f"  Top source cited: {agent_res['recalled_knowledge'][0]['filename']}")

        # 6. Document Deletion & Cascade Clean-up
        print("\n--- Test 5: Cascade Deletion ---")
        del_success = KnowledgeBaseService.delete_document(db, tenant_id, doc_res["id"])
        assert del_success is True
        remaining_chunks = db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == doc_res["id"]).count()
        assert remaining_chunks == 0
        print("  [PASS] Document and all indexed vector chunks cleanly deleted.")

        print("\n=================================================================")
        print("🎉 ALL 5 KNOWLEDGE BASE RAG TESTS PASSED WITH ZERO ERRORS!")
        print("=================================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_knowledge_base_pipeline()
