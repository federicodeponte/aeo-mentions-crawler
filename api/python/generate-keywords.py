"""
Vercel Python Serverless Function for Keyword Generation
On-demand execution - no persistent service needed
"""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler

# Add openkeyword to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../python-services/openkeyword'))

from openkeywords import KeywordGeneratorV2, CompanyInfo, KeywordGenerationConfig


class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler"""
    
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            # Initialize generator
            generator = KeywordGeneratorV2(
                google_api_key=os.getenv("GEMINI_API_KEY"),
                seranking_api_key=os.getenv("SERANKING_API_KEY")
            )
            
            # Build company info
            company_info = CompanyInfo(
                name=data.get('company_name'),
                url=data.get('company_url'),
                description=data.get('company_description'),
                industry=data.get('industry'),
                target_audience=data.get('target_audience'),
                products=data.get('products', []),
                competitors=data.get('competitors', [])
            )
            
            # Build config
            config = KeywordGenerationConfig(
                target_language=data.get('language', 'en'),
                target_country=data.get('country', 'US'),
                target_count=data.get('target_count', 50),
            )
            
            # Generate keywords
            mode = data.get('mode', 'generate')
            if mode == 'refresh' and data.get('existing_keywords'):
                config.seed_keywords = data['existing_keywords']
                result = generator.refresh(
                    company_info=company_info,
                    existing_keywords=data['existing_keywords'],
                    config=config
                )
            else:
                result = generator.generate(
                    company_info=company_info,
                    config=config
                )
            
            # Format response
            keywords = []
            for kw in result.keywords:
                keywords.append({
                    "keyword": kw.keyword,
                    "intent": kw.intent,
                    "score": kw.score,
                    "cluster_name": kw.cluster_name,
                    "is_question": kw.is_question,
                    "source": kw.source,
                    "volume": kw.volume,
                    "difficulty": kw.difficulty,
                    "aeo_opportunity": getattr(kw, 'aeo_opportunity', None),
                })
            
            response = {
                "keywords": keywords,
                "metadata": {
                    "company_name": data.get('company_name'),
                    "company_url": data.get('company_url'),
                    "total_keywords": len(keywords),
                    "mode": mode,
                    "generation_time": result.generation_time
                }
            }
            
            # Return response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
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
            "service": "keyword-generator-vercel-function",
            "type": "serverless"
        }
        self.wfile.write(json.dumps(response).encode())

