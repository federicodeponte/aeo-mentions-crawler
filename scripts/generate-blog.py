#!/usr/bin/env python3
"""
Simple blog generation script for local development
Called directly via subprocess from Next.js API route
"""

import sys
import json
import os
import asyncio
from datetime import datetime

# Add blog-writer to path
blog_writer_path = os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'blog-writer')
sys.path.insert(0, blog_writer_path)

from pipeline.core.workflow_engine import WorkflowEngine
from service.api import BlogGenerationRequest


async def generate_blog(input_data: dict) -> dict:
    """Generate blog using WorkflowEngine"""
    try:
        # Parse request
        request = BlogGenerationRequest(**input_data)
        
        # Generate job ID
        job_id = f"local-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{request.primary_keyword[:20]}"
        
        # Build job config (as the FastAPI service does)
        job_config = {
            "primary_keyword": request.primary_keyword,
            "company_url": request.company_url,
            "language": request.language,
            "country": request.country,
            "index": request.index,
        }
        
        # Add optional fields
        if request.company_name:
            job_config["company_name"] = request.company_name
        if request.company_data:
            job_config["company_data"] = request.company_data.model_dump()
        if request.word_count:
            job_config["word_count"] = request.word_count
        if request.tone:
            job_config["tone"] = request.tone
        if request.system_prompts:
            job_config["system_prompts"] = request.system_prompts
        if request.content_generation_instruction:
            job_config["content_generation_instruction"] = request.content_generation_instruction
        
        # Initialize engine and execute
        engine = WorkflowEngine()
        context = await engine.execute(job_id=job_id, job_config=job_config)
        
        # Extract result from context
        result = {
            "success": True,
            "job_id": job_id,
            "headline": context.structured_data.headline if context.structured_data else None,
            "slug": context.slug,
            "html_content": context.final_article.get("html_content") if context.final_article else None,
            "word_count": len(context.final_article.get("html_content", "").split()) if context.final_article else 0,
            "aeo_score": context.aeo_score,
        }
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "type": type(e).__name__
        }


def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Run async blog generation
        result = asyncio.run(generate_blog(input_data))
        
        # Output result to stdout
        print(json.dumps(result))
        sys.exit(0 if result.get("success") else 1)
        
    except Exception as e:
        error_output = {
            "success": False,
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
