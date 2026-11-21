import sys
import unittest
sys.path.insert(0, "backend")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.services.cloud_simulator import seed_multitenant_aws_data
from app.api.billing import list_tenants, list_aws_accounts, get_aws_kpi, query_cost_explorer, get_idle_resources
from app.api.anomalies import list_anomalies, get_anomaly_details, trigger_detection
from app.api.alerts import list_alert_rules, send_test_alert, TestAlertRequest
from app.api.agents import chat_with_agent, remediate_idle_resource, ChatRequest, RemediationRequest

class TestOneSightMultiTenantAWS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use isolated in-memory database so production onesight.db is never touched
        cls.test_engine = create_engine("sqlite:///:memory:")
        TestSession = sessionmaker(bind=cls.test_engine)
        Base.metadata.create_all(bind=cls.test_engine)
        cls.db = TestSession()
        # Seed multi-tenant AWS data in test memory
        seed_multitenant_aws_data(cls.db, days=30)
        # Run detection
        trigger_detection(tenant_id="tenant-acme", db=cls.db)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_tenants_and_aws_accounts(self):
        tenants = list_tenants(self.db)
        self.assertGreaterEqual(len(tenants), 2)
        acme = next(t for t in tenants if t["id"] == "tenant-acme")
        self.assertEqual(len(acme["aws_accounts"]), 3)
        print(f"\n[PASS] Multi-Tenant: Found {len(tenants)} tenants. Tenant Acme has {len(acme['aws_accounts'])} linked AWS accounts.")

    def test_02_aws_kpi_summary(self):
        kpi = get_aws_kpi(account_id=None, tenant_id="tenant-acme", db=self.db)
        self.assertIn("mtd_spend", kpi)
        self.assertIn("forecast_month_end", kpi)
        self.assertIn("prior_month_spend", kpi)
        self.assertIn("daily_burn_rate", kpi)
        self.assertGreater(kpi["forecast_month_end"], 0)
        print(f"[PASS] AWS KPI Summary: MTD=${kpi['mtd_spend']:,.2f}, Forecast=${kpi['forecast_month_end']:,.2f}, Burn Rate=${kpi['daily_burn_rate']:,.2f}/day")

    def test_03_cost_explorer_group_by_service(self):
        ce_res = query_cost_explorer(group_by="service", days=30, tenant_id="tenant-acme", db=self.db)
        self.assertEqual(ce_res["dimension"], "service")
        self.assertGreater(len(ce_res["timeline"]), 10)
        self.assertGreater(len(ce_res["breakdown"]), 0)
        top_svc = ce_res["breakdown"][0]
        self.assertIn("variance_amount", top_svc)
        print(f"[PASS] AWS Cost Explorer (Group By Service): Top service is {top_svc['dimension_name']} (${top_svc['total_spend']:,.2f}, {top_svc['percentage_of_total']}%)")

    def test_04_cost_explorer_group_by_account(self):
        ce_res = query_cost_explorer(group_by="account", days=30, tenant_id="tenant-acme", db=self.db)
        self.assertEqual(ce_res["dimension"], "account")
        self.assertGreater(len(ce_res["breakdown"]), 0)
        print(f"[PASS] AWS Cost Explorer (Group By Account): Segmented across {len(ce_res['breakdown'])} linked member accounts.")

    def test_05_cost_explorer_group_by_region(self):
        ce_res = query_cost_explorer(group_by="region", days=30, tenant_id="tenant-acme", db=self.db)
        self.assertEqual(ce_res["dimension"], "region")
        self.assertGreater(len(ce_res["breakdown"]), 0)
        print(f"[PASS] AWS Cost Explorer (Group By Region): Segmented across regions ({[b['dimension_name'] for b in ce_res['breakdown']]})")

    def test_06_cost_explorer_group_by_tag(self):
        ce_res = query_cost_explorer(group_by="tag:Team", days=30, tenant_id="tenant-acme", db=self.db)
        self.assertEqual(ce_res["dimension"], "tag:Team")
        self.assertGreater(len(ce_res["breakdown"]), 0)
        print(f"[PASS] AWS Cost Explorer (Group By Tag:Team): Cost allocation tags active ({[b['dimension_name'] for b in ce_res['breakdown']]})")

    def test_07_aws_anomalies_and_rca(self):
        anomalies = list_anomalies(tenant_id="tenant-acme", db=self.db)
        self.assertGreater(len(anomalies), 0)
        top_anom = anomalies[0]
        self.assertIsNotNone(top_anom["root_cause_summary"])
        print(f"[PASS] AWS Cost Anomaly Detection: Anomaly on {top_anom['account_name']} ({top_anom['service_name']}) has AI RCA summary: {top_anom['root_cause_summary'][:50]}...")

    def test_08_aws_alerts_and_test(self):
        rules = list_alert_rules(tenant_id="tenant-acme", db=self.db)
        self.assertGreater(len(rules), 0)
        test_res = send_test_alert(
            TestAlertRequest(channel="SLACK", title="AWS FinOps Diagnostic", message="Testing AWS alert rules"),
            tenant_id="tenant-acme",
            db=self.db
        )
        self.assertEqual(test_res["status"], "DISPATCHED")
        print(f"[PASS] AWS Alerts: Verified {len(rules)} active alert rules and test dispatch to {test_res['channel']}.")

    def test_09_aws_finops_agent(self):
        chat_res = chat_with_agent(
            ChatRequest(message="What idle AWS resources are wasting money?"),
            tenant_id="tenant-acme",
            db=self.db
        )
        self.assertIn("scan_aws_idle_resources", chat_res["tools"])
        print(f"[PASS] AWS FinOps AI Copilot: Executed tool {chat_res['tools']}.")

    def test_10_aws_idle_remediation(self):
        idle_items = get_idle_resources(tenant_id="tenant-acme", db=self.db)["idle_resources"]
        self.assertGreater(len(idle_items), 0)
        res_id = idle_items[0]["resource_id"]
        rem = remediate_idle_resource(
            RemediationRequest(resource_id=res_id),
            tenant_id="tenant-acme",
            db=self.db
        )
        self.assertEqual(rem["status"], "REMEDIATED")
        print(f"[PASS] AWS Auto-Remediation: Remediated {res_id}, saved ${rem['monthly_savings']:.2f}/mo.")

if __name__ == "__main__":
    unittest.main()
