# OneSight (Costimizer) — Getting Started & Run Guide

This guide walks you through setting up, configuring, and starting **OneSight** on Windows, macOS, or Linux.

---

## 1. Prerequisites

Ensure the following tools are installed on your machine:
- **Docker Desktop** (version 24.0+ recommended with Docker Compose v2).
- **Python 3.12+** (with pip).
- **Node.js 18+** or **Node.js 20+** with `pnpm` (run `corepack enable` or `npm install -g pnpm`).
- *(Optional for Local AI)* **Ollama** installed on your host machine ([Download Ollama](https://ollama.com/download)).

---

## 2. Environment Configuration

1. In the project root (`D:\One Data Solution\OneSight`), inspect or copy `.env.example`:
   ```powershell
   # Windows PowerShell
   Copy-Item .env.example .env
   ```

2. Review key settings in `.env`:
   ```ini
   # Database Configuration (PostgreSQL for Docker, SQLite for local dev)
   DATABASE_URL="sqlite:///onesight.db"
   
   # AI Provider Configuration (ollama, groq, openai, gemini)
   ACTIVE_LLM_PROVIDER="ollama"
   OLLAMA_BASE_URL="http://localhost:11434"
   OLLAMA_MODEL="llama3.1"
   
   # Optional Cloud LLM Keys
   GROQ_API_KEY=""
   GROQ_MODEL="openai/gpt-oss-120b"
   OPENAI_API_KEY=""
   GEMINI_API_KEY=""
   
   # Standalone Mem0 Service Endpoint
   MEM0_URL="http://localhost:8888"
   ```

---

## 3. Starting the Project (Option A: Full Docker Stack — Recommended)

The simplest way to run all 4 microservices is via Docker Compose:

```powershell
# Build and start all containers in detached mode
docker compose up -d --build
```

### Services Launched:

| Container Name | Service | URL / Port | Description |
| :--- | :--- | :--- | :--- |
| **`onesight-frontend`** | Next.js 14 Web UI | `http://localhost:3000` | Main FinOps dashboard, CostMap, Copilot chat & Settings |
| **`onesight-backend`** | FastAPI Core Engine | `http://localhost:8000/docs` | Live AWS Cost Explorer, Anomaly Detector & LangGraph Copilot |
| **`onesight-mem0`** | Standalone Mem0 Service | `http://localhost:8888/docs` | Dedicated episodic agent memory & hybrid vector search |
| **`onesight-db`** | PostgreSQL 16 | `localhost:5432` | Relational database with persistent volume `onesight_pgdata` |

### Useful Docker Commands:
```powershell
# View real-time logs across all services
docker compose logs -f

# Check status of containers
docker compose ps

# Stop all containers (data in volumes is preserved)
docker compose down

# Start only the database (useful for local Python development)
docker compose up -d db

# Start only the Mem0 standalone service
docker compose up -d mem0
```

---

## 4. Starting the Project (Option B: Local Hybrid Development)

If you are developing features and want live code-reloading without rebuilding Docker containers:

### Step 1: Start the Database (or use local SQLite)
```powershell
# Start PostgreSQL container
docker compose up -d db
```
*(Alternatively, leave `DATABASE_URL="sqlite:///onesight.db"` in `.env` to run completely serverless!)*

---

### Step 2: Start the Backend (FastAPI)
```powershell
# Navigate to backend
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Start backend server with auto-reload
python run.py
```
- API is running at: **`http://localhost:8000`**
- Interactive Swagger documentation: **`http://localhost:8000/docs`**

---

### Step 3: Start the Standalone Mem0 Service
Open a second terminal:
```powershell
# From project root
cd mem0

# Run Mem0 standalone microservice
uvicorn server:app --host 0.0.0.0 --port 8888 --reload
```
- Mem0 REST API running at: **`http://localhost:8888`**
- Interactive Swagger documentation: **`http://localhost:8888/docs`**
- Healthcheck: **`http://localhost:8888/health`**

---

### Step 4: Start the Frontend (Next.js 14)
Open a third terminal:
```powershell
# Navigate to frontend
cd frontend

# Install packages (first time only)
pnpm install

# Start development server
pnpm dev
```
- Open browser at: **`http://localhost:3000`**

---

## 5. Setting Up Local Ollama (Optional for Offline AI)

If you want 100% private, free offline AI inference on your machine:

1. Open PowerShell and verify Ollama is installed:
   ```powershell
   ollama --version
   ```

2. Pull the recommended LLM reasoning model (4.9 GB):
   ```powershell
   ollama run llama3.1
   ```

3. *(Optional)* Pull the local embedding model:
   ```powershell
   ollama pull nomic-embed-text
   ```

4. Verify Ollama is running at `http://localhost:11434`.

---

## 6. Testing & Verifying Your Setup

### 1. Test the Mem0 CLI from Terminal
From the project root:
```powershell
# Check Mem0 status
python mem0/cli.py status

# List initial FinOps team rules
python mem0/cli.py list

# Run a semantic vector search
python mem0/cli.py search "MongoDB disaster recovery volume"
```

### 2. Test in the Web Browser
1. Open **`http://localhost:3000`**.
2. **Cost Map:** Click **Cost Map** in the sidebar to view the spend density topology and 24 active AWS services with official AWS 64px architecture logos.
3. **AI Copilot:** Click **AI Copilot** and ask:
   > *"What idle resources are wasting money?"*
4. **Settings:** Click **Settings** to test AI provider latency (Ollama vs Groq) or manage stored Mem0 rules in the **Agent Memory** tab.

---

## 7. Troubleshooting & FAQ

### Issue 1: `connectex: An attempt was made to access a socket in a way forbidden...`
- **Cause:** Ollama is not running on port 11434, or Windows Firewall is blocking it.
- **Fix:** Start Ollama from the Windows start menu or run `ollama serve`. In Docker, ensure `OLLAMA_BASE_URL=http://host.docker.internal:11434` with `extra_hosts: ["host.docker.internal:host-gateway"]` in `docker-compose.yml`.

### Issue 2: `EPERM: operation not permitted` during `pnpm build`
- **Cause:** `pnpm dev` is currently running and holding file locks on `.next/`.
- **Fix:** Stop `pnpm dev` before running `pnpm build`, or run `pnpm exec tsc --noEmit` to validate TypeScript without writing chunk files.

### Issue 3: Git rejects push with `GH013: Secret Scanning`
- **Cause:** A live API key (e.g. `gsk_...` or AWS key) was staged in a file.
- **Fix:** Remove the secret from `.env.example` or code, amend the commit, and re-push.
