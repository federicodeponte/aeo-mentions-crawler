"""
Vercel Python Serverless Function for Blog Generation
On-demand execution - no persistent service needed
"""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler

# Add blog-writer to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../python-services/blog-writer'))

from pipeline.core import WorkflowEngine
from pipeline.core.job_manager import JobConfig
from service.api import BlogGenerationRequest


class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler"""
    
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            # Parse request
            request = BlogGenerationRequest(**data)
            
            # Initialize workflow engine
            engine = WorkflowEngine()
            
            # Create job config
            job_config = JobConfig(
                job_id=f"blog_{data.get('primary_keyword', 'article').replace(' ', '_')}",
                request_data=data
            )
            
            # Execute pipeline
            result = engine.execute(
                request=request,
                config=job_config
            )
            
            # Return response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_response = {
                "error": str(e),
                "type": type(e).__name__
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_GET(self):
        """Health check"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {
            "status": "healthy",
            "service": "blog-writer-vercel-function",
            "type": "serverless"
        }
        self.wfile.write(json.dumps(response).encode())

