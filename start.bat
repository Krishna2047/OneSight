@echo off
echo ========================================================
echo Starting OneSight FinOps Cloud Billing Platform
echo ========================================================
start "OneSight Backend (Port 8000)" cmd /k "python backend/run.py"
start "OneSight Frontend (Port 3000)" cmd /k "cd frontend && pnpm run dev"
echo Backend URL:  http://127.0.0.1:8000
echo Frontend URL: http://localhost:3000
timeout /t 4 >nul
start http://localhost:3000
