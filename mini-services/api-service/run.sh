#!/bin/bash
trap 'echo "Received signal: $?" >> /tmp/api-signals.log' SIGTERM SIGINT SIGHUP SIGKILL
cd /home/z/my-project/mini-services/api-service
echo "Starting at $(date)" >> /tmp/api-signals.log
/home/z/.venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 2>&1
echo "Exited at $(date) with code $?" >> /tmp/api-signals.log
