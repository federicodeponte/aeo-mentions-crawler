#!/usr/bin/env python3
"""
Simple blog generation script for local development
Called directly via subprocess from Next.js API route
"""

import sys
import json
import os

# Add blog-writer to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../python-services/blog-writer'))

from pipeline.core import WorkflowEngine
from service.api import BlogGenerationRequest


def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Parse request
        request = BlogGenerationRequest(**input_data)
        
        # Initialize engine
        engine = WorkflowEngine()
        
        # Execute pipeline
        result = engine.execute(request)
        
        # Output result to stdout
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        error_output = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

