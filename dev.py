#!/usr/bin/env python3
"""
Development helper script to run both frontend and backend servers
"""
import subprocess
import sys
import os
import time
import signal
from threading import Thread

def run_backend():
    """Run the FastAPI backend server"""
    print("🚀 Starting FastAPI backend on http://localhost:8000")
    subprocess.run([
        sys.executable, "-m", "uvicorn", 
        "api.agent:app", 
        "--host", "127.0.0.1", 
        "--port", "8000", 
        "--reload",
        "--reload-dir", "api"
    ])

def run_frontend():
    """Run the Vite frontend server"""
    print("🎨 Starting Vite frontend on http://localhost:8080")
    subprocess.run(["npm", "run", "dev"])

def main():
    print("🔧 AI Life Planner Development Server")
    print("=" * 50)
    
    try:
        # Start backend in a separate thread
        backend_thread = Thread(target=run_backend, daemon=True)
        backend_thread.start()
        
        # Give backend a moment to start
        time.sleep(2)
        
        # Start frontend (this will block)
        run_frontend()
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down development servers...")
        sys.exit(0)

if __name__ == "__main__":
    main()
