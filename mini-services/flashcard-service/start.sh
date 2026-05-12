#!/bin/bash
# Start the Flashcard Python service
cd /home/z/my-project/mini-services/flashcard-service
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 3002
