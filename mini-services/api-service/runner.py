#!/usr/bin/env python3
"""
Persistent API Service Runner
Keeps the uvicorn server alive by monitoring and restarting it.
"""
import subprocess
import sys
import os
import time

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def main():
    while True:
        print(f"[api-runner] Starting uvicorn on port 3001...", flush=True)
        proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"],
            stdout=sys.stdout,
            stderr=sys.stderr,
        )
        print(f"[api-runner] Started with PID {proc.pid}", flush=True)

        # Wait for process to end
        retcode = proc.wait()
        print(f"[api-runner] Process exited with code {retcode}. Restarting in 2s...", flush=True)
        time.sleep(2)

if __name__ == "__main__":
    main()
