#!/usr/bin/env python3
"""
Run AEO Checks service locally (no Modal)
Usage: python run_local.py
"""

import os
import sys
from pathlib import Path

# Load environment variables BEFORE any other imports
# This ensures env vars are available when modules are imported
def load_env():
    """Load environment variables from .env.local file."""
    env_file = Path(__file__).parent.parent.parent / ".env.local"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    os.environ[key] = value
        print(f"✅ Loaded environment variables from {env_file}")
        return True
    else:
        print(f"⚠️  No .env.local file found at {env_file}")
        return False

# Load env vars immediately (before imports)
load_env()

# Now import after env vars are loaded
import uvicorn
from main import app

if __name__ == "__main__":
    print("🚀 Starting AEO Checks service locally...")
    print("   Endpoint: http://localhost:8000")
    print("   Press Ctrl+C to stop")
    
    # Verify critical env vars
    if not os.getenv("OPENROUTER_API_KEY"):
        print("   ⚠️  WARNING: OPENROUTER_API_KEY not set - mentions checks will fail!")
    else:
        print(f"   ✅ OPENROUTER_API_KEY loaded (length: {len(os.getenv('OPENROUTER_API_KEY'))})")
    print()
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

