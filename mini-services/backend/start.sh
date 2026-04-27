#!/bin/bash
# Start the LearnHub Backend (Python FastAPI)
# This is the unified backend service running on port 3001

cd "$(dirname "$0")"

# Install Python dependencies if needed
if [ ! -d ".venv" ]; then
    echo "[learnhub-backend] Creating virtual environment..."
    python3 -m venv .venv
fi

echo "[learnhub-backend] Installing dependencies..."
.venv/bin/pip install -q -r requirements.txt

echo "[learnhub-backend] Starting uvicorn on port 3001..."
exec .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 3001 --reload
