#!/bin/bash
# Legacy start script — kept for backwards compatibility.
# Prefer using the root-level start-all.sh instead:
#   cd /home/z/my-project && bash start-all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/backend"

# Install Python dependencies
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "[learnhub-backend] Installing dependencies..."
    pip3 install -q -r requirements.txt
fi

echo "[learnhub-backend] Starting on port 3001..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 --reload
