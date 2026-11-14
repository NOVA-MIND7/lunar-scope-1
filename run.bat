@echo off
setlocal
echo ========================================================
echo Starting Lunar Scope Backend and Frontend...
echo ========================================================

REM Check if backend virtual environment exists
cd /d "%~dp0backend"
if not exist ".venv" (
    echo [Backend] Creating Python virtual environment (.venv)...
    python -m venv .venv
    echo [Backend] Installing Python dependencies...
    call .venv\Scripts\activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    if not exist ".env" (
        if exist ".env.example" (
            copy .env.example .env >nul
            echo [Backend] Created .env from .env.example
        )
    )
) else (
    echo [Backend] Virtual environment found.
)

REM Check if frontend node_modules exists
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo [Frontend] Installing Node.js dependencies (npm install)...
    call npm install
) else (
    echo [Frontend] node_modules found.
)

echo.
echo ========================================================
echo Starting servers in separate command windows...
echo ========================================================

REM Start Backend server in a new window
start "Lunar Scope Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

REM Start Frontend server in a new window
start "Lunar Scope Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting up!
echo   - Backend API: http://localhost:8000 (Docs: http://localhost:8000/api/docs)
echo   - Frontend UI: http://localhost:5173
echo.
pause
