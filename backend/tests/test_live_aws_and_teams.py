import sys
import os
import unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import SessionLocal
from app.services.alert_dispatcher import AlertDispatcher
from app.services.aws_live_service import AWSLiveCostExplorerService

class TestLiveAWSAndTeams(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_teams_alert_dispatch(self):
        payload = {
            "title": "AWS Spend Spike Diagnostic",
            "message": "Testing Microsoft Teams Adaptive Card format.",
            "severity": "CRITICAL",
            "provider": "AWS",
            "service": "Amazon Bedrock",
            "cost_delta": 450.00,
            "pct_deviation": 85.0
        }
        res = AlertDispatcher.send_teams(None, payload)
        self.assertEqual(res["channel"], "TEAMS")
        self.assertEqual(res["payload"]["@type"], "MessageCard")
        self.assertIn("OneSight FinOps Alert", res["payload"]["sections"][0]["activityTitle"])
        print("[PASS] Microsoft Teams Adaptive Card formatted & dispatched.")

    def test_live_aws_verification_offline_resilience(self):
        # Without credentials, it should gracefully report NO_CREDENTIALS with diagnostic message
        res = AWSLiveCostExplorerService.verify_credentials("FAKE_KEY", "FAKE_SECRET")
        self.assertFalse(res["success"])
        self.assertIn("error_code", res)
        print(f"[PASS] AWS Cost Explorer resilience verified: {res['message'][:80]}...")

if __name__ == "__main__":
    unittest.main()
