# PrithviNet Startup Script
# Starts backend (FastAPI on :8000) and frontend (Vite on :8080)

$root = $PSScriptRoot

Write-Host "Starting PrithviNet Backend (port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; ..\\.venv\Scripts\uvicorn.exe main:app --reload --port 8000" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting PrithviNet Frontend (port 8080)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Both servers starting!" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:8080" -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "  API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
