#!/bin/bash
# Start ALL LearnHub backend services with a single command.
# Usage: cd mini-services && bash start-all.sh
#
# Services started:
#   - backend (port 3001) - Unified Python FastAPI (Auth, Flashcard, Vocabulary, Review Logs)

echo "========================================="
echo "  LearnHub Backend Services - Starting   "
echo "========================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# --- Start Backend (Python FastAPI) ---
echo ""
echo "[1/1] Starting LearnHub Backend (port 3001)..."
cd "$BACKEND_DIR"

# Install Python dependencies
if command -v pip3 &> /dev/null; then
    pip3 install -q -r requirements.txt 2>/dev/null || pip install -q -r requirements.txt 2>/dev/null
    echo "  → Dependencies installed"
else
    echo "  → Warning: pip3 not found, skipping dependency install"
fi

# Start uvicorn in background
python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 &
BACKEND_PID=$!
echo "  → Backend started (PID: $BACKEND_PID, port: 3001)"

echo ""
echo "========================================="
echo "  All services are running!              "
echo "  Backend API: http://localhost:3001      "
echo "  API Docs:    http://localhost:3001/docs "
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for all background processes
wait
