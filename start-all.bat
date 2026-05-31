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

REM Load environment variables from .env if it exists
if exist "%PROJECT_DIR%\.env" (
    echo   - Loading environment variables from .env...
    for /f "usebackq delims== tokens=1,*" %%A in ("%PROJECT_DIR%\.env") do (
        set "VAR_NAME=%%A"
        set "VAR_VAL=%%B"
        if not "!VAR_NAME:~0,1!"=="#" (
            if not "!VAR_NAME!"=="" (
                set "!VAR_NAME!=!VAR_VAL!"
            )
        )
    )
)

echo =========================================
echo   LearnHub - Starting All Services
echo =========================================

REM --- 1. Start Backend (Python FastAPI) ---
echo.
echo [1/3] Starting Python Backend (port 3001)...

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

REM Install TGCL & GPU dependencies
echo   - Installing GPU-accelerated PyTorch and ML dependencies...
uv pip install --python "%VENV_DIR%\Scripts\python.exe" -r requirements-torch.txt --extra-index-url https://download.pytorch.org/whl/cu121

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

REM --- 2. Start WebSocket Server (Bun) ---
echo.
echo [2/3] Starting WebSocket Server (port 3002)...

cd /d "%PROJECT_DIR%"

REM Check if bun is available
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] bun not found! WebSocket server requires Bun to run.
    echo   Please install Bun: https://bun.sh
    pause
    exit /b 1
)

REM Start WebSocket Server in background
start "LearnHub Socket" /min bun src/socket-server.ts
echo   - WebSocket Server started (port: 3002)

REM Wait for WebSocket server to be ready
echo   - Waiting for WebSocket server to be ready...
set READY=0
for /L %%i in (1,1,10) do (
    if !READY! equ 0 (
        timeout /t 1 /nobreak >nul
        curl -s http://localhost:3002/?token=learnhub_secret_token_2026 >nul 2>nul
        if !errorlevel! equ 0 (
            set READY=1
            echo   - WebSocket Server is ready!
        )
    )
)
if %READY% equ 0 (
    echo   - Warning: WebSocket server health check timed out (may still be starting)
)

REM --- 3. Start Frontend (Next.js) ---
echo.
echo [3/3] Starting Next.js Frontend (port 3000)...

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
start "LearnHub Frontend" /min %PKG_MGR% run dev
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
echo ===================================================
echo   All services are running!
echo   Frontend:    http://localhost:3000
echo   Backend:     http://localhost:3001
echo   WebSocket:   ws://localhost:3002 (Secure Token)
echo   API Docs:    http://localhost:3001/docs
echo ===================================================
echo.
echo   Close the terminal windows or press any key
echo   here to stop all services.
echo.

pause

REM Kill all processes using ports 3000, 3001, and 3002
echo.
echo Stopping all services...

echo   - Stopping Frontend (port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo   - Stopping Backend (port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo   - Stopping WebSocket Server (port 3002)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

timeout /t 2 /nobreak >nul 
REM Also clean up opened windows if they are still present
taskkill /fi "WINDOWTITLE eq LearnHub Backend*" >nul 2>nul
taskkill /fi "WINDOWTITLE eq LearnHub Socket*" >nul 2>nul
taskkill /fi "WINDOWTITLE eq LearnHub Frontend" >nul 2>nul

echo All services stopped.

endlocal
