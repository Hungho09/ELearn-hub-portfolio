#!/bin/bash
# Start the LearnHub Python Backend (FastAPI on port 3001)
# Usage: cd backend && bash start.sh

cd "$(dirname "$0")"

# Install Python dependencies if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "[learnhub-backend] Installing dependencies..."
    pip3 install -q -r requirements.txt
fi

echo "[learnhub-backend] Starting uvicorn on port 3001..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 --reload
