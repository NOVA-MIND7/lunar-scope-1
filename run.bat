@echo off
setlocal
title Lunar Scope Launcher

echo ========================================================
echo Starting Lunar Scope Backend and Frontend...
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Verify Python virtual environment or Python installation
if not exist "backend\.venv\Scripts\activate.bat" (
    echo [Backend] Virtual environment not found. Setting it up...
    set "PY_CMD="
    py -3.11 --version >nul 2>&1 && set "PY_CMD=py -3.11"
    if not defined PY_CMD py -3.13 --version >nul 2>&1 && set "PY_CMD=py -3.13"
    if not defined PY_CMD py -3 --version >nul 2>&1 && set "PY_CMD=py -3"
    if not defined PY_CMD python --version >nul 2>&1 && set "PY_CMD=python"

    if not defined PY_CMD (
        echo [ERROR] Python was not found. Please install Python 3.11+.
        echo.
        pause
        exit /b 1
    )

    echo [Backend] Creating virtual environment...
    call %PY_CMD% -m venv backend\.venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        echo.
        pause
        exit /b 1
    )

    echo [Backend] Installing requirements...
    call "%~dp0backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
    call "%~dp0backend\.venv\Scripts\pip.exe" install -r "%~dp0backend\requirements.txt"
) else (
    echo [Backend] Virtual environment verified.
)

:: Ensure backend .env exists
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo [Backend] Created .env file from .env.example
    )
)

:: 2. Verify Frontend dependencies
if not exist "frontend\node_modules" (
    echo [Frontend] Installing dependencies...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
) else (
    echo [Frontend] Dependencies verified.
)

echo.
echo ========================================================
echo Starting backend and frontend in separate windows...
echo ========================================================
echo.

:: Launch Backend in separate cmd window
start "Lunar Scope Backend (Port 8000)" /d "%~dp0backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

:: Launch Frontend in separate cmd window
start "Lunar Scope Frontend (Port 5173)" /d "%~dp0frontend" cmd /k "npm run dev"

echo Backend URL:  http://localhost:8000 (Docs: http://localhost:8000/api/docs)
echo Frontend URL: http://localhost:5173
echo.
echo Both servers have been launched successfully.
echo You can keep this window open or close it at any time.
echo.
pause
