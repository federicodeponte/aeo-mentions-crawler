#!/usr/bin/env python3
"""
Blog Writer Local Server
Runs the blog-writer FastAPI app locally on port 8001
"""
import sys
import os
from pathlib import Path

# Add blog-writer to path
blog_writer_path = Path(__file__).parent / "blog-writer"
sys.path.insert(0, str(blog_writer_path))

# Import the FastAPI app
from main import app

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.environ.get("BLOG_SERVER_PORT", 8001))
    print(f"🚀 Starting blog-writer server on http://localhost:{port}")
    print(f"📝 Endpoints:")
    print(f"   - POST http://localhost:{port}/generate")
    print(f"   - POST http://localhost:{port}/refresh")
    print(f"   - GET  http://localhost:{port}/health")
    print()
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False,
    )
