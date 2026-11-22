# OneSight — AI Agent & Developer Onboarding Guide

> **Target Audience:** Any AI Assistant (Antigravity, Claude, Cursor, Copilot) or human engineer joining the OneSight project. Read this entire document before writing code or suggesting changes.

---

## 1. Quick Orientation

**What is OneSight?**
OneSight (styled in the frontend UI as **Costimizer**) is a multi-tenant Cloud Financial Management (FinOps) observability and Agentic AI platform. It connects to live AWS accounts (e.g. Account `476383094285`), ingests daily Cost Explorer spend across 24 AWS services, detects statistical anomalies, generates automated Root Cause Analyses (RCA), and runs a conversational FinOps Copilot backed by a dedicated **Mem0** episodic memory microservice.

---

## 2. The 5 Core Invariants (Must NEVER be Violated)

1. **Zero Mock Spend Data in Production Paths:**Never substitute real AWS Cost Explorer records with hardcoded random figures. All spend numbers shown to users, calculated by anomaly detectors, or cited by the AI Copilot must come from actual database records populated via AWS Cost Explorer APIs.
2. **Strict Multi-Tenancy:**Every query, table, model, alert, and memory record must enforce `tenant_id` filtering (defaulting to `tenant-acme`). Cross-tenant data leaks are considered critical severity bugs.
3. **Conversational Brevity on Casual Greetings:**When a user inputs pleasantries or greetings (*"hi"*, *"hello"*, *"good morning"*), the Copilot must respond with a warm, concise 1-2 sentence greeting. **Never dump spend tables, forecasts, or telemetry dumps on a simple greeting.** Detailed tables are only output when the user explicitly queries them.
4. **Adaptive Fallback Resiliency:**Never allow an external API failure (Ollama offline, Groq rate-limited, OpenAI expired) to crash the application. Always write code with local fallbacks (e.g. built-in CPU feature vectorizer for Mem0, ReAct heuristics for agent chat).
5. **Secret Protection & Git Push Hygiene:**
   Never hardcode real API keys (e.g. `gsk_...`, `ghp_...`, AWS Access Keys) into `.env.example`, code comments, or committed files. GitHub Secret Scanning actively blocks commits containing live secrets.

---

## 3. Where Things Live in the Codebase

| Feature / Capability                      | Frontend Location                                       | Backend Location                                               |
| :---------------------------------------- | :------------------------------------------------------ | :------------------------------------------------------------- |
| **AWS Cost Explorer & Metrics**     | `src/components/AWSCostExplorer.tsx`                  | `app/services/aws_cost_explorer.py`, `app/api/billing.py`  |
| **Spend Topology Map**              | `src/components/CostMap.tsx`                          | `app/services/aws_cost_explorer.py`                          |
| **Official AWS 64px SVGs**          | `public/aws-icons/` (44 SVGs), `AWSServiceLogo.tsx` | —                                                             |
| **Anomaly Detection & RCA**         | `src/components/AnomalyFeed.tsx`, `RCAModal.tsx`    | `app/services/detector.py`, `app/api/anomalies.py`         |
| **Alert Rules & Channels**          | `src/components/AlertRulesView.tsx`                   | `app/services/alert_dispatcher.py`, `app/api/alerts.py`    |
| **FinOps Copilot Chat**             | `src/components/AgentChatConsole.tsx`                 | `app/services/agent_runtime.py`, `app/api/agents.py`       |
| **Mem0 Agent Memory Engine**        | `src/components/SettingsView.tsx` (Tab 2)             | `mem0/server.py` (:8888), `app/services/memory_service.py` |
| **Mem0 CLI Management Tool**        | —                                                      | `mem0/cli.py`                                                |
| **CloudFormation Customer Onboard** | `src/components/OnboardingModal.tsx`                  | `onesight-cft.yaml`, `app/api/billing.py`                  |

---

## 4. How to Run & Develop

### Mode A: Full Docker Stack (Recommended for Production Validation)

```powershell
# Start PostgreSQL, Standalone Mem0, Backend, and Frontend
docker compose up -d

# Check status
docker compose ps
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1`
- Mem0 Standalone API Docs: `http://localhost:8888/docs`

---

### Mode B: Local Hybrid Development (Fastest Iteration)

1. **Start the database:**

   ```powershell
   docker compose up -d db
   ```

   *(Or let backend run against local SQLite `backend/onesight.db`)*
2. **Run Backend:**

   ```powershell
   cd backend
   python run.py
   ```

   *(Runs on `http://localhost:8000`)*
3. **Run Frontend:**

   ```powershell
   cd frontend
   pnpm dev
   ```

   *(Runs on `http://localhost:3000`)*
4. **Run Mem0 CLI (from project root):**

   ```powershell
   # Check memory status
   python mem0/cli.py status

   # List memories
   python mem0/cli.py list

   # Test semantic vector search
   python mem0/cli.py search "disaster recovery"
   ```

---

## 5. Verification & Testing Playbook

When making changes, execute these verification commands:

### 1. Backend & Mem0 Direct Verification

```powershell
python -c "
import sys; sys.path.insert(0, 'backend'); sys.path.insert(0, 'mem0')
from app.services.memory_service import Mem0Service
from app.core.database import SessionLocal
db = SessionLocal()
res = Mem0Service.search_memories(db, 'tenant-acme', 'idle ebs volume failover')
print(f'Mem0 Verification Passed: Found {len(res)} matches. Top score: {res[0][\"score\"]}')
db.close()
"
```

### 2. Frontend Type Checking

```powershell
cd frontend
pnpm exec tsc --noEmit
```

Ensure zero TypeScript compilation errors. Note: Do not run `pnpm build` while `next dev` is concurrently holding locks on `.next/` directory.

---

## 6. Common Pitfalls & Solutions

1. **Ollama connection fails from Docker:**
   - In Docker, `localhost` points inside the container. Always use `http://host.docker.internal:11434` with `extra_hosts: ["host.docker.internal:host-gateway"]` in `docker-compose.yml`.
2. **Git lock issues on Windows:**
   - If git fails with `Unable to create 'index.lock'`, ensure no background Git or IDE process is holding a lock, or run with BypassSandbox if outside sandboxed filesystem bounds.
3. **EPERM during `pnpm build`:**
   - Windows file locking causes `EPERM` if the dev server (`pnpm dev`) is running. Stop the dev server before running `pnpm build`, or use `pnpm exec tsc --noEmit` to validate types without file collisions.
