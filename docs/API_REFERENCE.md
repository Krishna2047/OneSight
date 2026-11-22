# OneSight — REST API Reference & Contract Specification

This document provides the complete API specification for OneSight's backend services, including header specifications, request payloads, response schemas, and sample `curl` commands.

---

## 1. Authentication & Common Headers

All backend API requests require the `x-tenant-id` header to enforce multi-tenant isolation. If omitted, the server defaults to `tenant-acme`.

| Header Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `x-tenant-id` | `string` | No | `tenant-acme` | Partition identifier for multi-tenant isolation |
| `Content-Type` | `string` | For POST/PATCH | `application/json` | Request MIME type |

Base URL:
- Local Direct Backend: `http://localhost:8000/api/v1`
- Standalone Mem0 Service: `http://localhost:8888`

---

## 2. Billing & AWS Cost Explorer (`/billing`)

### 2.1. Get Cost Summary (KPI Rollup)
Returns total spend, Month-to-Date (MTD) spend, 7-day rolling daily burn rate, and projected month-end spend.

- **Method:** `GET`
- **Path:** `/api/v1/billing/summary`
- **Query Params:**
  - `account_id` (optional, string): Filter by AWS account ID (e.g. `476383094285`).
- **Response Schema:**
  ```json
  {
    "total_spend": 704.48,
    "mtd_spend": 704.48,
    "daily_burn_rate": 24.18,
    "forecast_month_end": 725.40,
    "currency": "USD",
    "rolling_days": 30,
    "active_services_count": 24
  }
  ```
- **Sample Request:**
  ```bash
  curl -X GET "http://localhost:8000/api/v1/billing/summary?account_id=476383094285" \
       -H "x-tenant-id: tenant-acme"
  ```

---

### 2.2. Query Cost & Usage Breakdown
Queries historical spend grouped by dimension (`service`, `region`, `usage_type`).

- **Method:** `GET`
- **Path:** `/api/v1/billing/cost-and-usage`
- **Query Params:**
  - `days` (int, default: `30`): Historical window (e.g. `7`, `30`, `90`).
  - `group_by` (string, default: `service`): Grouping dimension (`service`, `region`).
  - `account_id` (optional, string): Filter by specific AWS account.
  - `service_filter` (optional, string): Filter by specific AWS service.
- **Response Schema:**
  ```json
  {
    "period_label": "Last 30 Days",
    "total_period_spend": 704.48,
    "currency": "USD",
    "breakdown": [
      {
        "dimension_name": "Amazon Elastic Compute Cloud - Compute",
        "total_spend": 528.26,
        "percentage_of_total": 75.0,
        "prior_period_spend": 179.68,
        "period_variance_amount": 348.58,
        "period_variance_percent": 94.0
      }
    ],
    "timeline": [
      {
        "date": "2026-11-20",
        "total_cost": 23.40,
        "by_service": {
          "Amazon Elastic Compute Cloud - Compute": 18.20
        }
      }
    ]
  }
  ```

---

### 2.3. Get AWS Onboarding Template
Generates the AWS CloudFormation 1-click URL, IAM Role name, and external ID for cross-account customer onboarding.

- **Method:** `GET`
- **Path:** `/api/v1/billing/aws/onboarding-template`
- **Response Schema:**
  ```json
  {
    "onesight_account_id": "476383094285",
    "external_id": "onesight-tenant-acme-sec-9812",
    "role_name": "OneSightCostExplorerRole",
    "cloudformation_yaml": "AWSTemplateFormatVersion: ...",
    "quick_create_url": "https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?...",
    "cli_command": "aws cloudformation create-stack --stack-name OneSight-FinOps-Integration ...",
    "terraform_hcl": "resource \"aws_iam_role\" \"onesight_role\" { ... }"
  }
  ```

---

## 3. Cost Anomaly Detection & RCA (`/anomalies`)

### 3.1. List Cost Anomalies
Returns detected cost anomalies ordered by deviation and cost impact.

- **Method:** `GET`
- **Path:** `/api/v1/anomalies`
- **Query Params:**
  - `account_id` (optional, string)
  - `severity` (optional, string: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `status` (optional, string: `ACTIVE`, `INVESTIGATING`, `RESOLVED`, `IGNORED`)
- **Response Schema:**
  ```json
  [
    {
      "id": 1,
      "tenant_id": "tenant-acme",
      "account_id": "476383094285",
      "account_name": "AWS Production",
      "service_name": "Amazon Bedrock (GenAI)",
      "region": "us-east-1",
      "anomaly_date": "2026-11-21",
      "baseline_cost": 4.10,
      "current_cost": 38.60,
      "cost_delta": 34.50,
      "deviation_percent": 841.5,
      "severity": "CRITICAL",
      "status": "ACTIVE",
      "root_cause_summary": "Runaway Generative AI inference loop detected..."
    }
  ]
  ```

---

### 3.2. Trigger Statistical Anomaly Detection
Triggers the rolling 7-day Z-score anomaly detector across all linked accounts.

- **Method:** `POST`
- **Path:** `/api/v1/anomalies/detect`
- **Response Schema:**
  ```json
  {
    "status": "SUCCESS",
    "detected_count": 2,
    "message": "Detection completed. Identified 2 statistical cost anomalies."
  }
  ```

---

### 3.3. Trigger AI Root Cause Analysis (RCA)
Generates an AI-driven FinOps root cause analysis, identifying suspect ARNs and remediation scripts.

- **Method:** `POST`
- **Path:** `/api/v1/anomalies/{id}/rca`
- **Response Schema:**
  ```json
  {
    "status": "COMPLETED",
    "anomaly_id": 1,
    "root_cause_summary": "Unthrottled batch evaluation loop triggered runaway Claude 3.5 Sonnet invocation tokens.",
    "suspect_resources": [
      "arn:aws:bedrock:us-east-1:476383094285:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    ],
    "remediation_recommendations": [
      "Apply AWS Service Quotas token invocation throttling.",
      "Implement exponential backoff in client worker pools.",
      "Provision CloudWatch Metric Alarm for Bedrock Invocations."
    ],
    "cli_remediation": "aws bedrock put-model-invocation-logging-configuration ...",
    "confidence": 0.95
  }
  ```

---

## 4. Agentic AI & Copilot (`/agents`)

### 4.1. Conversational FinOps Chat
Interactive endpoint powering the FinOps Copilot. Uses live AWS telemetry grounding and Mem0 rule retrieval.

- **Method:** `POST`
- **Path:** `/api/v1/agents/chat`
- **Request Body:**
  ```json
  {
    "message": "What idle resources are wasting money?"
  }
  ```
- **Response Schema:**
  ```json
  {
    "reply": "### 🔍 AWS Idle & Orphaned Resource Audit\n\nWe identified 3 idle AWS assets wasting $98.40/mo...",
    "tools": ["mem0_hybrid_recall", "scan_aws_idle_resources"],
    "thoughts": "Tenant: 'tenant-acme'\nMem0 recalled 1 relevant organizational rule(s)."
  }
  ```

---

### 4.2. Get & Update AI Provider Settings
Inspects and switches active inference providers (Ollama vs Groq vs OpenAI).

- **GET `/api/v1/agents/config`:**
  ```json
  {
    "active_provider": "ollama",
    "providers": {
      "ollama": {
        "status": "CONNECTED",
        "current_model": "llama3.1",
        "base_url": "http://localhost:11434"
      },
      "groq": {
        "configured": true,
        "current_model": "openai/gpt-oss-120b"
      }
    }
  }
  ```

- **POST `/api/v1/agents/config`:**
  ```json
  {
    "active_provider": "groq",
    "groq_model": "openai/gpt-oss-120b"
  }
  ```

---

## 5. Mem0 Agent Memory APIs

Accessible via backend proxy (`/api/v1/agents/memories`) and directly via the standalone microservice (`http://localhost:8888/v1/memories`).

### 5.1. List Agent Memories
- **Method:** `GET`
- **Path:** `/api/v1/agents/memories` (or `:8888/v1/memories`)
- **Query Params:**
  - `category` (optional, string: `IDLE_WASTE`, `BUDGET`, `EC2`, `S3`, `GENERAL`)
  - `limit` (int, default: `50`)
- **Response Schema:**
  ```json
  [
    {
      "id": 1,
      "tenant_id": "tenant-acme",
      "memory_type": "RESOURCE_EXEMPTION",
      "category": "IDLE_WASTE",
      "content": "Volume vol-0a882a6f (MongoDB DR Standby) is intentionally kept unattached for cross-region failover. Do not remediate.",
      "embedding_provider": "hybrid-cpu-dense",
      "metadata": {
        "resource_id": "vol-0a882a6f"
      },
      "created_at": "2026-11-22T14:46:27Z"
    }
  ]
  ```

---

### 5.2. Create Agent Memory / Rule
- **Method:** `POST`
- **Path:** `/api/v1/agents/memories` (or `:8888/v1/memories`)
- **Request Body:**
  ```json
  {
    "content": "Our target monthly AWS budget ceiling is $15,000.",
    "memory_type": "FINOPS_RULE",
    "category": "BUDGET",
    "metadata": {
      "budget_limit": 15000,
      "currency": "USD"
    }
  }
  ```
- **Response Schema:**
  ```json
  {
    "id": 2,
    "tenant_id": "tenant-acme",
    "memory_type": "FINOPS_RULE",
    "category": "BUDGET",
    "content": "Our target monthly AWS budget ceiling is $15,000.",
    "embedding_provider": "hybrid-cpu-dense",
    "created_at": "2026-11-22T14:50:00Z"
  }
  ```

---

### 5.3. Hybrid Semantic Vector Search
- **Method:** `POST`
- **Path:** `/api/v1/agents/memories/search` (or `:8888/v1/memories/search`)
- **Request Body:**
  ```json
  {
    "query": "MongoDB standby failover volume",
    "limit": 3
  }
  ```
- **Response Schema:**
  ```json
  [
    {
      "id": 1,
      "tenant_id": "tenant-acme",
      "memory_type": "RESOURCE_EXEMPTION",
      "category": "IDLE_WASTE",
      "content": "Volume vol-0a882a6f (MongoDB DR Standby) is intentionally kept unattached for cross-region failover. Do not remediate.",
      "score": 0.756
    }
  ]
  ```

---

### 5.4. Delete Memory
- **Method:** `DELETE`
- **Path:** `/api/v1/agents/memories/{id}` (or `:8888/v1/memories/{id}`)
- **Response:**
  ```json
  {
    "status": "DELETED",
    "id": 1
  }
  ```
