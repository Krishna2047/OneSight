# OneSight FinOps Platform Startup Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting OneSight FinOps Cloud Billing Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Start Backend FastAPI Server
Write-Host "Starting Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python backend/run.py"

# 2. Start Frontend Next.js Dev Server
Write-Host "Starting Frontend on http://localhost:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; pnpm run dev"

# 3. Open browser after brief startup pause
Start-Sleep -Seconds 4
Write-Host "Opening http://localhost:3000..." -ForegroundColor Green
Start-Process "http://localhost:3000"
