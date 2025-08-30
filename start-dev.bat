@echo off
echo ================================
echo AI Life Planner Development Setup
echo ================================
echo.

echo Starting FastAPI backend server...
start "FastAPI Backend" cmd /k "python -m uvicorn api.agent:app --host 127.0.0.1 --port 8000 --reload --reload-dir api"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Vite frontend server...
start "Vite Frontend" cmd /k "npm run dev"

echo.
echo ================================
echo Both servers are starting!
echo ================================
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:8000
echo ================================
echo.
echo Press any key to close this window...
pause > nul
