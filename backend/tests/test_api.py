import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "OneSight" in data["platform"]

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_billing_overview():
    response = client.get("/api/v1/billing/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_spend" in data
    assert "aws_spend" in data
    assert "gcp_spend" in data
    assert "azure_spend" in data
    assert "forecast_30d" in data

def test_anomalies_and_detection():
    # Test detection endpoint
    detect_resp = client.post("/api/v1/anomalies/detect")
    assert detect_resp.status_code == 200

    # Test list anomalies
    list_resp = client.get("/api/v1/anomalies")
    assert list_resp.status_code == 200
    anomalies = list_resp.json()
    assert isinstance(anomalies, list)
    if len(anomalies) > 0:
        first_id = anomalies[0]["id"]
        detail_resp = client.get(f"/api/v1/anomalies/{first_id}")
        assert detail_resp.status_code == 200
        assert detail_resp.json()["id"] == first_id

def test_alert_rules_and_channels():
    # List rules
    rules_resp = client.get("/api/v1/alerts/rules")
    assert rules_resp.status_code == 200
    assert len(rules_resp.json()) > 0

    # Test test-alert endpoint
    test_alert_payload = {
        "channel": "SLACK",
        "severity": "WARNING",
        "title": "Automated Unit Test Alert",
        "message": "Testing OneSight alert dispatcher"
    }
    test_resp = client.post("/api/v1/alerts/test", json=test_alert_payload)
    assert test_resp.status_code == 200
    assert test_resp.json()["status"] == "DISPATCHED"

def test_agent_chat():
    chat_payload = {"message": "What idle resources are wasting money?"}
    chat_resp = client.post("/api/v1/agents/chat", json=chat_payload)
    assert chat_resp.status_code == 200
    result = chat_resp.json()
    assert "reply" in result
    assert "tools" in result
    assert "scan_idle_resources" in result["tools"]
