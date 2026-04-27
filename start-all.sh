#!/bin/bash
# ============================================================
#  LearnHub — Start ALL services with a single command
#
#  Usage:  cd /home/z/my-project && bash start-all.sh
#
#  Starts:
#    1. Python FastAPI backend  (port 3001)
#    2. Next.js frontend        (port 3000)
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/mini-services/backend"

echo "========================================="
echo "  LearnHub — Starting All Services      "
echo "========================================="

# ─── 1. Start Backend (Python FastAPI) ────────────────────────
echo ""
echo "[1/2] Starting Python Backend (port 3001)..."

cd "$BACKEND_DIR"

# Install Python dependencies if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "  → Installing Python dependencies..."
    pip3 install -q -r requirements.txt
else
    echo "  → Dependencies already installed"
fi

# Start uvicorn in background
python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 --reload &
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
