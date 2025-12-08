#!/usr/bin/env python3
"""
Standalone streaming server for keyword generation
Run this alongside Next.js dev server on port 8001
"""

import sys
import os
import json
import asyncio
import time
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Load environment variables from .env.local
script_dir = Path(__file__).parent
env_local = script_dir.parent / '.env.local'
if env_local.exists():
    print(f"Loading env from: {env_local}")
    with open(env_local) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # Remove quotes if present
                value = value.strip('"').strip("'")
                os.environ[key] = value
                if 'API_KEY' in key:
                    print(f"Loaded {key}: {value[:20]}...")
else:
    print(f"Warning: .env.local not found at {env_local}")

# Add openkeyword to path
openkeyword_path = script_dir / 'openkeyword'
sys.path.insert(0, str(openkeyword_path))

from openkeywords.company_analyzer import analyze_company
from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

class StreamingHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle streaming keyword generation"""
        if self.path != '/generate':
            self.send_error(404)
            return

        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            # Send SSE headers
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # Run generation with streaming
            asyncio.run(self.stream_generation(data))

        except Exception as e:
            import traceback
            error_msg = f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
            self.wfile.write(error_msg.encode('utf-8'))
            print(f"Error: {e}")
            traceback.print_exc()

    async def stream_generation(self, data):
        """Stream keyword generation with progress"""
        def emit(stage, progress, message, substage=None):
            """Emit progress update"""
            progress_data = {
                "type": "progress",
                "stage": stage,
                "progress": progress,
                "message": message,
            }
            if substage:
                progress_data["substage"] = substage
            
            msg = f"data: {json.dumps(progress_data)}\n\n"
            self.wfile.write(msg.encode('utf-8'))
            self.wfile.flush()

        try:
            api_key = data.get('apiKey') or os.getenv('GEMINI_API_KEY')
            if not api_key:
                emit('error', 0, 'No API key configured', 'error')
                return

            # Stage 1: Company Analysis (0-15%)
            emit('company_analysis', 0, 'Starting company analysis...', 'initializing')
            
            analyze_url = data.get('analyze_url')
            if analyze_url:
                emit('company_analysis', 5, f'Analyzing {analyze_url}...', 'analyzing')
                company_data = await analyze_company(analyze_url, api_key=api_key)
                
                company_info = CompanyInfo(
                    name=company_data.get('company_name', data.get('company_name', 'Unknown')),
                    url=analyze_url,
                    industry=company_data.get('industry', ''),
                    description=company_data.get('description', ''),
                    products=company_data.get('products', []),
                    services=company_data.get('services', []),
                    pain_points=company_data.get('pain_points', []),
                    use_cases=company_data.get('use_cases', []),
                    competitors=company_data.get('competitors', []),
                    target_location=company_data.get('primary_region'),
                    target_audience=", ".join(company_data.get('target_audience', [])) if isinstance(company_data.get('target_audience'), list) else company_data.get('target_audience', ''),
                    brand_voice=company_data.get('brand_voice'),
                    solution_keywords=company_data.get('solution_keywords', []),
                )
                emit('company_analysis', 15, 'Company analysis complete', 'complete')
            else:
                # Use provided data
                company_info = CompanyInfo(
                    name=data.get('company_name', 'Unknown'),
                    url=data.get('company_url', ''),
                    industry=data.get('industry', ''),
                    description=data.get('description', ''),
                    products=data.get('products', []),
                    services=data.get('services', []),
                    pain_points=data.get('pain_points', []),
                    use_cases=data.get('use_cases', []),
                    competitors=data.get('competitors', []),
                    target_location=data.get('target_location'),
                    target_audience=data.get('target_audience', ''),
                    brand_voice=data.get('brand_voice'),
                    solution_keywords=data.get('solution_keywords', []),
                )
                emit('company_analysis', 15, 'Using provided context', 'complete')

            # Stage 2: Configuration (15-20%)
            emit('configuration', 15, 'Setting up...', 'setup')
            
            config = GenerationConfig(
                target_count=data.get('num_keywords') or data.get('target_count', 50),
                min_score=70,
                enable_research=data.get('enable_research', True),
                enable_serp_analysis=data.get('enable_serp_analysis', True),
                min_word_count=data.get('min_word_count', 4),
                language=data.get('language', 'english'),
                region=data.get('region', 'us'),
            )
            
            emit('configuration', 20, 'Configuration complete', 'complete')

            # Stage 3-7: Generation (20-95%)
            emit('ai_generation', 20, 'Generating keywords...', 'generating')
            emit('ai_generation', 30, 'Generating seed keywords...', 'seed')
            
            start_time = time.time()
            generator = KeywordGenerator(gemini_api_key=api_key)
            result = await generator.generate(company_info=company_info, config=config)
            generation_time = time.time() - start_time
            
            emit('ai_generation', 40, f'Generated {len(result.keywords)} keywords', 'complete')
            
            # Simulate remaining stages
            if config.enable_research:
                emit('research', 45, 'Analyzing forums...', 'forums')
                emit('research', 55, 'Complete', 'complete')
            
            if config.enable_serp_analysis:
                emit('serp_analysis', 60, 'Analyzing SERP...', 'analyzing')
                emit('serp_analysis', 75, 'Complete', 'complete')
            
            emit('deduplication', 80, 'Removing duplicates...', 'semantic')
            emit('deduplication', 88, 'Complete', 'complete')
            
            emit('clustering', 90, 'Clustering...', 'grouping')
            emit('clustering', 94, 'Complete', 'complete')
            
            emit('finalization', 95, 'Preparing results...', 'formatting')

            # Send final result
            output = {
                "type": "result",
                "keywords": [
                    {
                        "keyword": kw.keyword,
                        "intent": kw.intent,
                        "score": kw.score,
                        "cluster_name": kw.cluster_name,
                        "is_question": kw.is_question,
                        "source": kw.source,
                        "volume": kw.volume,
                        "difficulty": kw.difficulty,
                        "aeo_opportunity": kw.aeo_opportunity,
                        "has_featured_snippet": kw.has_featured_snippet,
                        "has_paa": kw.has_paa,
                        "serp_analyzed": kw.serp_analyzed,
                    }
                    for kw in result.keywords
                ],
                "metadata": {
                    "company_name": company_info.name,
                    "company_url": company_info.url,
                    "total_keywords": len(result.keywords),
                    "generation_time": generation_time,
                }
            }
            
            msg = f"data: {json.dumps(output)}\n\n"
            self.wfile.write(msg.encode('utf-8'))
            self.wfile.flush()
            
            emit('finalization', 100, 'Complete!', 'complete')

        except Exception as e:
            import traceback
            error_msg = f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
            self.wfile.write(error_msg.encode('utf-8'))
            traceback.print_exc()

    def log_message(self, format, *args):
        """Custom log format"""
        print(f"[STREAMING-SERVER] {format % args}")


def run_server(port=8000):
    """Start the streaming server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, StreamingHandler)
    
    print("=" * 80)
    print(f"🚀 Streaming Server Started")
    print("=" * 80)
    print(f"Listening on: http://localhost:{port}")
    print(f"Endpoint: POST http://localhost:{port}/generate")
    print("\nReady to accept streaming keyword generation requests!")
    print("=" * 80)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down streaming server...")
        httpd.shutdown()


if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.getenv('PORT', '8001'))
    run_server(port)

