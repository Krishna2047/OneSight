# OneSight — Multi-Tenant AWS Billing & Cost Explorer AI Platform

<div align="center">

![OneSight Banner](https://img.shields.io/badge/OneSight-AWS%20FinOps%20AI%20Platform-orange?style=for-the-badge&logo=amazon-aws)
![Python 3.12](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal?style=for-the-badge&logo=fastapi)
![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![Multi-Tenant](https://img.shields.io/badge/Multi--Tenant-Isolated%20Tenants-indigo?style=for-the-badge)

**Multi-Tenant AWS Billing & Cost Management, Cost Explorer Analytics, Real-Time Spike Anomaly Detection, and Autonomous Agentic AI Root Cause Analysis (RCA)**

</div>

---

## 🌟 Overview

**OneSight** has been upgraded to a **Multi-Tenant AWS Cost Explorer & FinOps Platform**. It provides an exact AWS Cost Explorer experience for tracking, analyzing, and optimizing cloud expenditures across complex AWS Organizations with multiple linked member accounts before extending to Azure and other clouds.

---

## 🚀 Key AWS Cost Explorer Features

| Feature | Description |
| :--- | :--- |
| **🏢 Multi-Tenant Architecture** | Complete organizational data isolation. Switch between organizations (e.g. *Acme Corp*, *FinTech Labs*) and their linked AWS accounts. |
| **📊 AWS Cost Explorer Visualizer** | Interactive stacked bar, stacked area, and line charts with real AWS color palettes and multi-dimensional segmentation. |
| **🔍 Dimensional Group By** | Group costs by **Service**, **Linked Member Account**, **Region**, **Usage Type**, and **Cost Allocation Tags** (`Tag: Team`, `Tag: Environment`). |
| **📈 Period-over-Period Variance** | Data table showing Current Period vs Prior Period spend, dollar variance, percentage jump, and overall share of total AWS spend. |
| **🚨 AWS Cost Anomaly Detection** | Real-time statistical anomaly engine (rolling 7d/14d Z-scores) detecting surges in Bedrock GenAI tokens, NAT Gateway cross-AZ data transfer, and EC2 ASG scale-outs. |
| **🤖 Agentic AI Root Cause Analysis (RCA)** | FinOps AI diagnostic agent isolates the offending AWS ARN, diagnoses root cause, estimates financial impact, and outputs copy-paste AWS CLI remediation commands. |
| **💬 AWS FinOps AI Copilot** | ReAct conversational agent equipped with tools to query Cost Explorer, explain anomalies, and audit idle assets. |
| **🗑️ AWS Idle Waste Auditor** | Automatically identifies unattached `gp3` EBS volumes, orphaned NAT gateways, and unassigned Elastic IPs with one-click auto-remediation. |
| **📢 Multi-Channel Alert Hub** | Dispatches formatted rich cards and embeds to **Slack** (Block Kit), **Discord** (Embeds), **Email** (HTML), and **Webhooks / PagerDuty**. |

---

## 🏗️ Multi-Tenant Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │          Multi-Tenant Organizations          │
                  │   Tenant 1: Acme Corp  | Tenant 2: FinTech   │
                  └──────────────────────┬───────────────────────┘
                                         │ Header: X-Tenant-ID
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           Linked AWS Member Accounts         │
                  │   • 112233445566 (Acme Production Core)      │
                  │   • 223344556677 (Acme AI & Data Platform)   │
                  │   • 334455667788 (Acme Staging & QA)         │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              OneSight Backend (FastAPI)                                │
├───────────────────────────────────────┬────────────────────────────────────────────────┤
│ • AWS Cost Explorer Engine            │ • AWS Cost Anomaly Detection (Z-Score & IQR)   │
│ • Dimensional Aggregation (Group By)  │ • Multi-Channel Dispatcher (Slack, Discord)     │
│ • Agentic FinOps AI (RCA + Copilot)   │ • AWS Auto-Remediation (EBS / NAT / EIP)       │
└───────────────────────────────────────┴────────────────────────────────────────────────┘
                                         │ REST API
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             OneSight Frontend (Next.js 14)                             │
├───────────────────────────────────────┬────────────────────────────────────────────────┤
│ • Organization & Account Switchers    │ • AWS Cost Explorer (Group By & Stacked Views) │
│ • AWS MTD & Forecast KPI Ribbon       │ • Cost & Usage Breakdown Variance Table        │
│ • Cost Anomaly Detection & AI RCA     │ • AWS FinOps Conversational AI Copilot         │
└───────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## ⚡ Quickstart

### 1. Run Backend Server
```powershell
cd backend
python run.py
```
> Server runs on `http://127.0.0.1:8000`. Interactive OpenAPI documentation at `http://127.0.0.1:8000/docs`.

### 2. Run Next.js Dashboard
In a separate terminal:
```powershell
cd frontend
pnpm run dev
```
> Open your browser at **`http://localhost:3000`**.

---

## 🧪 Verification & Automated Tests

Run the multi-tenant AWS test suite:
```powershell
python -u backend/tests/test_api_direct.py
```

Expected output:
```
[PASS] Multi-Tenant: Found 2 tenants. Tenant Acme has 3 linked AWS accounts.
[PASS] AWS KPI Summary: MTD=$28,622.22, Forecast=$45,430.20, Burn Rate=$1,514.34/day
[PASS] AWS Cost Explorer (Group By Service): Top service is Amazon EC2 ($17,841.96, 40.5%)
[PASS] AWS Cost Explorer (Group By Account): Segmented across 3 linked member accounts.
[PASS] AWS Cost Explorer (Group By Region): Segmented across regions (['us-east-1', 'us-west-2'])
[PASS] AWS Cost Explorer (Group By Tag:Team): Cost allocation tags active
[PASS] AWS Cost Anomaly Detection: Anomaly on Acme Production Core (AWS NAT Gateway) has AI RCA summary
[PASS] AWS Alerts: Verified 4 active alert rules and test dispatch to SLACK.
[PASS] AWS FinOps AI Copilot: Executed tool ['scan_aws_idle_resources'].
[PASS] AWS Auto-Remediation: Remediated vol-0a8819ef34c910a2, saved $165.00/mo.
----------------------------------------------------------------------
Ran 10 tests in 0.384s - OK
```

---

## 📄 License
MIT © 2026 OneSight Team
