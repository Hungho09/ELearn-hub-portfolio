#!/bin/bash
# ============================================================
#  LearnHub — Start ALL services with a single command
#
#  Usage:  cd /home/z/my-project && bash start-all.sh
#
#  Starts:
#    1. Python FastAPI backend  (port 3001) — uses uv for venv
#    2. Next.js frontend        (port 3000)
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/mini-services/backend"
VENV_DIR="$BACKEND_DIR/.venv"

echo "========================================="
echo "  LearnHub — Starting All Services      "
echo "========================================="

# ─── 1. Start Backend (Python FastAPI) ────────────────────────
echo ""
echo "[1/2] Starting Python Backend (port 3001)..."

cd "$BACKEND_DIR"

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo "  [ERROR] uv not found. Install it: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Create venv if it doesn't exist
if [ ! -f "$VENV_DIR/bin/python" ]; then
    echo "  → Creating virtual environment with uv..."
    uv venv "$VENV_DIR"
else
    echo "  → Virtual environment already exists"
fi

# Install dependencies with uv
echo "  → Installing Python dependencies with uv..."
uv pip install --python "$VENV_DIR/bin/python" -r requirements.txt

# Start uvicorn in background using venv python
"$VENV_DIR/bin/python" -m uvicorn main:app --host 0.0.0.0 --port 3001 --reload &
BACKEND_PID=$!
echo "  → Backend started (PID: $BACKEND_PID, port: 3001)"

# Wait for backend to be ready
echo "  → Waiting for backend to be ready..."
for i in $(seq 1 15); do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "  → Backend is ready!"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "  → Warning: Backend health check timed out (may still be starting)"
    fi
    sleep 1
done

# ─── 2. Start Frontend (Next.js) ─────────────────────────────
echo ""
echo "[2/2] Starting Next.js Frontend (port 3000)..."

cd "$PROJECT_DIR"

# Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "  → Installing Node dependencies..."
    bun install
else
    echo "  → Dependencies already installed"
fi

# Start Next.js in background
npx next dev -p 3000 &
FRONTEND_PID=$!
echo "  → Frontend started (PID: $FRONTEND_PID, port: 3000)"

# Wait for frontend to be ready
echo "  → Waiting for frontend to be ready..."
for i in $(seq 1 20); do
    if curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
            echo "  → Frontend is ready!"
            break
        fi
    fi
    if [ $i -eq 20 ]; then
        echo "  → Warning: Frontend health check timed out (may still be starting)"
    fi
    sleep 1
done

echo ""
echo "========================================="
echo "  All services are running!              "
echo "  Frontend:  http://localhost:3000       "
echo "  Backend:   http://localhost:3001       "
echo "  API Docs:  http://localhost:3001/docs  "
echo "========================================="
echo ""
echo "  PIDs: Backend=$BACKEND_PID, Frontend=$FRONTEND_PID"
echo "  Press Ctrl+C to stop all services."
echo ""

# Trap Ctrl+C to kill both processes
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for all background processes
wait
