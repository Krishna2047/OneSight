import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__))))

import unittest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.services.aws_live_service import AWSLiveCostExplorerService
from app.api.billing import get_aws_onboarding_template, onboard_sts_role, AWSOnboardSTSRequest

class TestSTSOnboarding(unittest.TestCase):
    def setUp(self):
        self.test_engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.test_engine)
        TestSession = sessionmaker(bind=self.test_engine)
        self.db = TestSession()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.test_engine)

    def test_cft_template_generation(self):
        """Verify 1-Click CloudFormation template and parameters."""
        data = AWSLiveCostExplorerService.generate_cft_template("tenant-acme")
        self.assertIn("onesight_account_id", data)
        self.assertIn("external_id", data)
        self.assertTrue(data["external_id"].startswith("onesight-acme"))
        self.assertIn("OneSightCostOptimizerRole", data["cloudformation_yaml"])
        self.assertIn("quickcreate", data["quick_create_url"])
        self.assertIn("param_ExternalId", data["quick_create_url"])
        print("\n[PASS] 1-Click CloudFormation template and quick-create URL generated successfully.")

    def test_onboarding_template_endpoint(self):
        """Verify get_aws_onboarding_template API function."""
        res = get_aws_onboarding_template(tenant_id="tenant-acme")
        self.assertEqual(res["role_name"], "OneSightCostOptimizerRole")
        self.assertIn("AWSTemplateFormatVersion", res["cloudformation_yaml"])
        print("[PASS] Onboarding template endpoint returned valid CloudFormation definition.")

    @patch.object(AWSLiveCostExplorerService, "sync_live_aws_to_database")
    @patch("boto3.Session")
    def test_verify_and_onboard_sts_role(self, mock_session_cls, mock_sync):
        """Verify STS assume role and organization discovery flow."""
        from app.models.tenant import Tenant
        self.db.add(Tenant(id="tenant-acme", name="Acme Test Org", slug="acme-test", plan="ENTERPRISE"))
        self.db.commit()

        mock_sync.return_value = {"success": True, "records_synced": 42}
        mock_session_instance = MagicMock()
        mock_session_cls.return_value = mock_session_instance

        mock_sts = MagicMock()
        mock_sts.assume_role.return_value = {
            "Credentials": {
                "AccessKeyId": "ASIA_MOCK_TEST_KEY",
                "SecretAccessKey": "MOCK_SECRET_KEY",
                "SessionToken": "MOCK_SESSION_TOKEN"
            }
        }
        mock_sts.get_caller_identity.return_value = {
            "Account": "112233445566",
            "Arn": "arn:aws:sts::112233445566:assumed-role/OneSightCostOptimizerRole/OneSightOnboardingSession"
        }
        mock_session_instance.client.return_value = mock_sts

        # Mock organizations discovery
        mock_org = MagicMock()
        mock_paginator = MagicMock()
        mock_paginator.paginate.return_value = [
            {
                "Accounts": [
                    {"Id": "112233445566", "Name": "Management Payer", "Status": "ACTIVE"},
                    {"Id": "998877665544", "Name": "Production Core", "Status": "ACTIVE"}
                ]
            }
        ]
        mock_org.get_paginator.return_value = mock_paginator

        def client_side_effect(service, **kwargs):
            if service == "sts":
                return mock_sts
            elif service == "organizations":
                return mock_org
            return MagicMock()

        mock_session_instance.client.side_effect = client_side_effect

        req = AWSOnboardSTSRequest(
            role_arn="arn:aws:iam::112233445566:role/OneSightCostOptimizerRole",
            external_id="onesight-acme-finops-auth",
            sync_immediately=True,
            days=30
        )

        res = onboard_sts_role(
            req=req,
            tenant_id="tenant-acme",
            db=self.db
        )

        self.assertTrue(res["success"])
        self.assertEqual(res["account_id"], "112233445566")
        self.assertGreaterEqual(res["discovered_accounts_count"], 1)
        print(f"[PASS] 1-Click STS AssumeRole verified customer account {res['account_id']} and auto-discovered {res['discovered_accounts_count']} organization accounts.")

if __name__ == "__main__":
    unittest.main()
