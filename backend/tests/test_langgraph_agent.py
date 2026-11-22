import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.services.langgraph_agent import LangGraphFinOpsEngine
from app.services.aws_command_runner import AWSReadOnlyCommandRunner
from app.api.agents import handle_proposal_action, ProposalActionRequest
from app.models.billing import IdleResource
from app.services.memory_service import Mem0Service

def test_safety_gate_blocking():
    print("\n--- Test 1: Guardrail 1 (Safety Gate - Block Destructive Commands) ---")
    mutating_commands = [
        "aws ec2 terminate-instances --instance-ids i-0123456789abcdef0",
        "aws s3 rm s3://my-prod-bucket/data.csv",
        "aws rds delete-db-instance --db-instance-identifier prod-db",
        "aws ec2 describe-instances; cat /etc/passwd",
        "aws ec2 describe-instances && rm -rf /",
        "aws ec2 stop-instances --instance-ids i-0123456789abcdef0"
    ]
    for cmd in mutating_commands:
        res = AWSReadOnlyCommandRunner.execute(cmd)
        assert res["status"] == "BLOCKED", f"Expected BLOCKED for '{cmd}', got {res['status']}"
        print(f"  [PASS] Blocked dangerous command: {cmd}")
    print("  >>> All mutating and injected commands blocked by Safety Gate!")

def test_read_only_allowed():
    print("\n--- Test 2: Guardrail 1 (Allowed Read-Only Commands) ---")
    read_only_commands = [
        "aws --version",
        "aws ec2 describe-instances",
        "aws s3api list-buckets",
        "aws cloudwatch describe-alarms",
        "aws sts get-caller-identity",
        "aws ec2 describe-volumes --filters Name=status,Values=available"
    ]
    for cmd in read_only_commands:
        is_valid, reason = AWSReadOnlyCommandRunner.validate_command(cmd)
        assert is_valid, f"Expected VALIDATED for '{cmd}', got {reason}"
        print(f"  [PASS] Validated read-only command: {cmd}")
    print("  >>> Read-only command patterns successfully validated!")

def test_langgraph_greeting():
    print("\n--- Test 3: LangGraph Greeting Intent ---")
    db = SessionLocal()
    try:
        res = LangGraphFinOpsEngine.run(db, "Hello copilot!", tenant_id="tenant-acme")
        assert "OneSight FinOps AI Copilot" in res["reply"]
        assert "476383094285" in res["reply"]
        print("  [PASS] Clean greeting returned without data dumping.")
    finally:
        db.close()

def test_langgraph_aws_cli_execution():
    print("\n--- Test 4: LangGraph Live AWS Read-Only Inspection ---")
    db = SessionLocal()
    try:
        res = LangGraphFinOpsEngine.run(db, "aws --version", tenant_id="tenant-acme")
        assert len(res["executed_commands"]) > 0
        cmd_run = res["executed_commands"][0]
        assert cmd_run["status"] == "SUCCESS"
        assert "aws-cli" in cmd_run["output"]
        print(f"  [PASS] Successfully executed '{cmd_run['command']}' in {cmd_run['latency_ms']}ms.")
        print(f"  Output preview: {cmd_run['output'][:50]}...")
    finally:
        db.close()

def test_langgraph_idle_waste_and_action_proposal():
    print("\n--- Test 5: LangGraph Idle Waste Audit & Action Proposal ---")
    db = SessionLocal()
    try:
        # First ensure test idle volume exists in DB
        existing = db.query(IdleResource).filter(
            IdleResource.tenant_id == "tenant-acme",
            IdleResource.resource_id == "vol-0a88df8e5926b48f1"
        ).first()
        if not existing:
            item = IdleResource(
                tenant_id="tenant-acme",
                account_id="476383094285",
                account_name="AWS Production",
                resource_id="vol-0a88df8e5926b48f1",
                resource_name="legacy-kafka-broker-02",
                resource_type="AWS EBS Volume",
                region="us-east-1",
                monthly_waste_cost=145.0,
                status="ACTIVE_IDLE"
            )
            db.add(item)
            db.commit()

        # Clear any prior exemption for clean test
        Mem0Service.clear_memories(db, tenant_id="tenant-acme")

        res = LangGraphFinOpsEngine.run(db, "What idle resources are wasting money?", tenant_id="tenant-acme")
        assert res["proposal"] is not None, "Action Proposal should be generated"
        proposal = res["proposal"]
        assert proposal["resource_id"] == "vol-0a88df8e5926b48f1"
        assert proposal["action"] == "SNAPSHOT_AND_DELETE"
        assert proposal["exempted"] is False
        assert proposal["status"] == "PENDING"
        print(f"  [PASS] Generated Action Proposal Card for {proposal['resource_id']} (Savings: ${proposal['monthly_savings']}/mo).")

        # Now test Mem0 Exemption learning:
        print("\n--- Test 6: Mem0 Exemption Learning & Policy Guardrail ---")
        exemption_text = "Remember: vol-0a88df8e5926b48f1 is for DR backup, do not delete"
        res_mem = LangGraphFinOpsEngine.run(db, exemption_text, tenant_id="tenant-acme")
        assert "FinOps Memory Saved" in res_mem["reply"]
        print("  [PASS] Learned policy committed to Mem0 memory layer.")

        # Re-run idle waste audit; proposal must now be marked EXEMPTED!
        res2 = LangGraphFinOpsEngine.run(db, "Find all unused EBS volumes", tenant_id="tenant-acme")
        assert res2["proposal"] is not None
        assert res2["proposal"]["exempted"] is True
        assert res2["proposal"]["status"] == "EXEMPTED"
        print(f"  [PASS] Guardrail Node applied Mem0 exemption: proposal status is now EXEMPTED ({res2['proposal']['exemption_reason']}).")

    finally:
        db.close()

def test_hitl_approval_endpoint():
    print("\n--- Test 7: Human-in-the-Loop (HITL) Approval Endpoint ---")
    db = SessionLocal()
    try:
        # 1. Test APPROVE action
        req_approve = ProposalActionRequest(
            proposal_id="prop-test-01",
            action="APPROVE",
            resource_id="vol-0a88df8e5926b48f1",
            resource_name="legacy-kafka-broker-02",
            monthly_savings=145.0
        )
        res_app = handle_proposal_action(req_approve, tenant_id="tenant-acme", db=db)
        assert res_app["status"] == "REMEDIATED"
        assert res_app["monthly_savings"] == 145.0
        print(f"  [PASS] HITL APPROVE executed: {res_app['message']}")

        # 2. Test EXEMPT action
        req_exempt = ProposalActionRequest(
            proposal_id="prop-test-02",
            action="EXEMPT",
            resource_id="eipalloc-019928fa",
            resource_name="unassigned-prod-elastic-ip",
            monthly_savings=3.65
        )
        res_ex = handle_proposal_action(req_exempt, tenant_id="tenant-acme", db=db)
        assert res_ex["status"] == "EXEMPTED"
        assert res_ex["memory_id"] is not None
        print(f"  [PASS] HITL EXEMPT committed to Mem0: {res_ex['message']}")

    finally:
        db.close()

if __name__ == "__main__":
    print("=================================================================")
    print("🧪 OneSight Powerful AI Agent End-to-End Test Suite")
    print("=================================================================")
    test_safety_gate_blocking()
    test_read_only_allowed()
    test_langgraph_greeting()
    test_langgraph_aws_cli_execution()
    test_langgraph_idle_waste_and_action_proposal()
    test_hitl_approval_endpoint()
    print("\n=================================================================")
    print("🎉 ALL 7 TEST SUITES PASSED WITH ZERO ERRORS!")
    print("=================================================================")
