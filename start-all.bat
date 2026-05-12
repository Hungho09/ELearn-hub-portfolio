@echo off
REM ============================================================
REM  LearnHub - Start ALL services with a single command
REM
REM  Usage:  cd \path\to\my-project && start-all.bat
REM
REM  Starts:
REM    1. Python FastAPI backend  (port 3001)  — uses uv for venv
REM    2. Next.js frontend        (port 3000)
REM ============================================================

setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%\mini-services\backend"
set "VENV_DIR=%BACKEND_DIR%\.venv"

echo =========================================
echo   LearnHub - Starting All Services
echo =========================================

REM --- 1. Start Backend (Python FastAPI) ---
echo.
echo [1/2] Starting Python Backend (port 3001)...

cd /d "%BACKEND_DIR%"

REM Check if uv is available
where uv >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] uv not found. Please install uv: https://docs.astral.sh/uv/getting-started/installation/
    echo   Or run: pip install uv
    pause
    exit /b 1
)

REM Create venv if it doesn't exist
if not exist "%VENV_DIR%\Scripts\python.exe" (
    echo   - Creating virtual environment with uv...
    uv venv "%VENV_DIR%"
) else (
    echo   - Virtual environment already exists
)

REM Install dependencies with uv
echo   - Installing Python dependencies with uv...
uv pip install --python "%VENV_DIR%\Scripts\python.exe" -r requirements.txt

REM Start uvicorn in background using venv python
start "LearnHub Backend" /min "%VENV_DIR%\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 3001 --reload
echo   - Backend started (port: 3001)

REM Wait for backend to be ready
echo   - Waiting for backend to be ready...
set READY=0
for /L %%i in (1,1,15) do (
    if !READY! equ 0 (
        timeout /t 1 /nobreak >nul
        curl -s http://localhost:3001/health >nul 2>nul
        if !errorlevel! equ 0 (
            set READY=1
            echo   - Backend is ready!
        )
    )
)
if %READY% equ 0 (
    echo   - Warning: Backend health check timed out (may still be starting)
)

REM --- 2. Start Frontend (Next.js) ---
echo.
echo [2/2] Starting Next.js Frontend (port 3000)...

cd /d "%PROJECT_DIR%"

REM Check if bun is available, fall back to npm
where bun >nul 2>nul
set PKG_MGR=bun
if %errorlevel% neq 0 (
    where npm >nul 2>nul
    set PKG_MGR=npm
    echo   - Note: bun not found, using npm instead
)

REM Install Node dependencies if needed
if not exist "node_modules\" (
    echo   - Installing Node dependencies...
    %PKG_MGR% install
) else (
    echo   - Dependencies already installed
)

REM Start Next.js in background
start "LearnHub Frontend" /min npx next dev -p 3000
echo   - Frontend started (port: 3000)

REM Wait for frontend to be ready
echo   - Waiting for frontend to be ready...
set READY=0
for /L %%i in (1,1,20) do (
    if !READY! equ 0 (
        timeout /t 1 /nobreak >nul
        curl -s -o nul -w "" http://localhost:3000/ >nul 2>nul
        if !errorlevel! equ 0 (
            set READY=1
            echo   - Frontend is ready!
        )
    )
)
if %READY% equ 0 (
    echo   - Warning: Frontend health check timed out (may still be starting)
)

echo.
echo =========================================
echo   All services are running!
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3001
echo   API Docs:  http://localhost:3001/docs
echo =========================================
echo.
echo   Close the backend/frontend windows or
echo   press any key here to stop all services.
echo.

pause

REM Kill the backend and frontend processes
echo.
echo Stopping all services...
taskkill /fi "WINDOWTITLE eq LearnHub Backend*" >nul 2>nul
taskkill /fi "WINDOWTITLE eq LearnHub Frontend*" >nul 2>nul
echo All services stopped.

endlocal
