# OneSight (Costimizer) — Documentation Index

Welcome to the central documentation hub for **OneSight** (styled as *Costimizer* in the UI). All architectural decisions, API contracts, deployment specifications, and onboarding guidelines are maintained in this directory.

---

## 📚 Documentation Catalog

| Document | Purpose & Description | Target Reader |
| :--- | :--- | :--- |
| **[GETTING_STARTED.md](./GETTING_STARTED.md)** | **Complete Setup & Run Guide.** Step-by-step instructions for running via Docker Compose (`docker compose up -d`), local hybrid dev, Mem0 CLI, and Ollama configuration. | All Developers & Operators |
| **[LANGGRAPH_AGENT_PLAN.md](./LANGGRAPH_AGENT_PLAN.md)** | **Autonomous Multi-Agent Swarm Blueprint.** Details the LangGraph cyclic state machine (`FinOpsAgentState`), 6 specialist nodes, and Human-in-the-Loop (HITL) approval workflows. | AI Agents & FinOps Architects |
| **[MASTER_ARCHITECTURE.md](./MASTER_ARCHITECTURE.md)** | **Canonical System Architecture & Blueprint.** Explains the full system topology, data flow, mathematical models for anomaly detection, Mem0 vector search, and roadmap. | AI Agents, Architects, Senior Engineers |
| **[API_REFERENCE.md](./API_REFERENCE.md)** | **Complete REST API Contract & Specification.** Documents every endpoint, header (`x-tenant-id`), query parameter, request payload, response schema, and curl examples. | Frontend/Backend Developers, Integrators |
| **[AI_ONBOARDING_GUIDE.md](./AI_ONBOARDING_GUIDE.md)** | **Quickstart & Invariant Guide for AI Agents.** Outlines the 5 core rules (zero mock data, strict multi-tenancy, fallback resiliency), directory mappings, and testing playbooks. | AI Assistants (Antigravity, Cursor, Claude), New Developers |

---

## 🚀 Quick Links
- **Web Dashboard:** `http://localhost:3000`
- **Backend API Docs (Swagger):** `http://localhost:8000/docs`
- **Mem0 Standalone Microservice Docs:** `http://localhost:8888/docs`
- **Mem0 Terminal CLI:** `python mem0/cli.py status`
- **Docker Compose Stack:** `docker compose up -d`
