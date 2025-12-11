#!/usr/bin/env python3
"""Debug import issues"""

import sys
import os
from pathlib import Path

print("=== IMPORT DEBUGGING ===")

# Add blog-writer to path
blog_writer_path = Path(__file__).parent / 'python-services' / 'blog-writer'
print(f"Blog writer path: {blog_writer_path}")
print(f"Path exists: {blog_writer_path.exists()}")

if blog_writer_path.exists():
    sys.path.insert(0, str(blog_writer_path))
    print("Path added to sys.path")
    
    try:
        from pipeline.core.workflow_engine import WorkflowEngine
        print("✅ WorkflowEngine import successful")
    except Exception as e:
        print(f"❌ WorkflowEngine import failed: {e}")
    
    try:
        from pydantic import BaseModel
        print("✅ Pydantic import successful")
    except Exception as e:
        print(f"❌ Pydantic import failed: {e}")
else:
    print("❌ Blog writer path not found")

print("=== END DEBUG ===")