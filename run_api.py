#!/usr/bin/env python3
"""
Simple script to run the FastAPI backend for development
"""
import uvicorn
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    uvicorn.run(
        "api.agent:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=["api"],
        log_level="info"
    )
