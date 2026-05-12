#!/usr/bin/env python3
"""
Persistent Flashcard Service Runner
Keeps the uvicorn server alive by monitoring and restarting it.
"""
import subprocess
import sys
import os
import time
import signal

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def main():
    while True:
        print(f"[flashcard-runner] Starting uvicorn on port 3002...", flush=True)
        proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3002"],
            stdout=sys.stdout,
            stderr=sys.stderr,
        )
        print(f"[flashcard-runner] Started with PID {proc.pid}", flush=True)
        
        # Wait for process to end
        retcode = proc.wait()
        print(f"[flashcard-runner] Process exited with code {retcode}. Restarting in 2s...", flush=True)
        time.sleep(2)

if __name__ == "__main__":
    main()
