#!/usr/bin/env python3
"""
Blog generation script for local development
Fully copied from blog-writer/service/api.py - complete stage initialization
"""

import sys
import json
import os
import asyncio
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List

# Add blog-writer to path
blog_writer_path = Path(__file__).parent.parent / 'python-services' / 'blog-writer'
sys.path.insert(0, str(blog_writer_path))

from pipeline.core.workflow_engine import WorkflowEngine
from pydantic import BaseModel, Field

# === REQUEST MODEL (copied from api.py) ===

class CompanyDataModel(BaseModel):
    """Company context data."""
    description: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[List[str]] = Field(default_factory=list)
    competitors: Optional[List[str]] = Field(default_factory=list)
    legal_info: Optional[Dict[str, Any]] = None
    author_name: Optional[str] = None
    author_bio: Optional[str] = None
    author_url: Optional[str] = None


class ExistingBlogSlug(BaseModel):
    """Existing blog for internal linking."""
    slug: str
    title: str
    keyword: str


class BlogGenerationRequest(BaseModel):
    """Request model for blog generation."""
    # Required
    primary_keyword: str
    company_url: str
    
    # Optional with defaults
    language: str = "en"
    country: str = "US"
    company_name: Optional[str] = None
    word_count: int = 1000
    tone: str = "professional"
    index: bool = True
    
    # Advanced
    company_data: Optional[CompanyDataModel] = None
    system_prompts: List[str] = Field(default_factory=list)
    content_generation_instruction: Optional[str] = None
    sitemap_urls: Optional[List[str]] = None
    apiKey: Optional[str] = None  # For local dev
    
    # Batch mode
    batch_mode: bool = False
    batch_keywords: Optional[List[Dict[str, Any]]] = None
    batch_siblings: Optional[List[Dict[str, Any]]] = None
    batch_id: Optional[str] = None


# === ENGINE INITIALIZATION (copied from api.py) ===

_engine: Optional[WorkflowEngine] = None


def get_engine() -> WorkflowEngine:
    """Get or create workflow engine instance with ALL stages registered."""
    global _engine
    if _engine is None:
        # Import all stages
        from pipeline.blog_generation.stage_00_data_fetch import DataFetchStage
        from pipeline.blog_generation.stage_01_prompt_build import PromptBuildStage
        from pipeline.blog_generation.stage_02_gemini_call import GeminiCallStage
        from pipeline.blog_generation.stage_03_extraction import ExtractionStage
        from pipeline.blog_generation.stage_04_citations import CitationsStage
        from pipeline.blog_generation.stage_05_internal_links import InternalLinksStage
        from pipeline.blog_generation.stage_06_toc import TableOfContentsStage
        from pipeline.blog_generation.stage_07_metadata import MetadataStage
        from pipeline.blog_generation.stage_08_faq_paa import FAQPAAStage
        from pipeline.blog_generation.stage_09_image import ImageStage
        from pipeline.blog_generation.stage_10_cleanup import CleanupStage
        from pipeline.blog_generation.stage_11_storage import StorageStage
        from pipeline.blog_generation.stage_12_review_iteration import ReviewIterationStage
        
        _engine = WorkflowEngine()
        _engine.register_stages([
            DataFetchStage(),           # Stage 0
            PromptBuildStage(),         # Stage 1
            GeminiCallStage(),          # Stage 2
            ExtractionStage(),          # Stage 3
            CitationsStage(),           # Stage 4
            InternalLinksStage(),       # Stage 5
            TableOfContentsStage(),     # Stage 6
            MetadataStage(),            # Stage 7
            FAQPAAStage(),              # Stage 8
            ImageStage(),               # Stage 9
            CleanupStage(),             # Stage 10
            ReviewIterationStage(),     # Stage 12
            StorageStage(),             # Stage 11 (registered last per api.py)
        ])
    return _engine


def generate_slug(text: str) -> str:
    """Generate URL-safe slug from text."""
    slug = text.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')[:80]


def calculate_read_time(word_count: int) -> int:
    """Calculate read time in minutes (avg 200 wpm)."""
    return max(1, round(word_count / 200))


# === MAIN GENERATION LOGIC (copied from api.py) ===

async def generate_blog(input_data: dict) -> dict:
    """Generate blog using complete workflow engine."""
    start_time = datetime.now()
    
    try:
        # Parse request
        request = BlogGenerationRequest(**input_data)
        
        # Set API key if provided (for local dev)
        if request.apiKey:
            os.environ['GEMINI_API_KEY'] = request.apiKey
        
        # Handle batch mode
        if request.batch_mode and request.batch_keywords:
            # Generate multiple blogs
            results = []
            batch_siblings = []
            
            # Build batch siblings from batch_keywords
            for kw_data in request.batch_keywords:
                slug = generate_slug(kw_data.get('keyword', ''))
                batch_siblings.append({
                    'slug': slug,
                    'title': kw_data.get('keyword', ''),
                    'keyword': kw_data.get('keyword', ''),
                })
            
            # Generate each blog in parallel
            async def generate_single_blog(idx, kw_data):
                keyword = kw_data.get('keyword', '')
                word_count = kw_data.get('word_count', request.word_count)
                
                # Generate job ID
                job_id = f"batch-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{idx}-{keyword[:20]}"
                
                # Build job config
                job_config = {
                    "primary_keyword": keyword,
                    "company_url": request.company_url,
                    "language": request.language,
                    "country": request.country,
                    "index": request.index,
                    "word_count": word_count,
                    "batch_id": request.batch_id or f"batch-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                    "batch_siblings": [s for i, s in enumerate(batch_siblings) if i != idx],
                }
                
                # Add optional fields
                if request.company_name:
                    job_config["company_name"] = request.company_name
                if request.company_data:
                    job_config["company_data"] = request.company_data.model_dump()
                if request.tone:
                    job_config["tone"] = request.tone
                if request.system_prompts:
                    job_config["system_prompts"] = request.system_prompts
                if request.content_generation_instruction:
                    job_config["content_generation_instruction"] = request.content_generation_instruction
                
                try:
                    # Execute
                    engine = get_engine()
                    context = await engine.execute(job_id=job_id, job_config=job_config)
                    
                    # Extract result
                    headline = ""
                    if context.structured_data:
                        headline = getattr(context.structured_data, 'Headline', None) or ""
                    
                    html_content = ""
                    if context.validated_article:
                        html_content = context.validated_article.get("html_content", "")
                    elif context.final_article:
                        html_content = context.final_article.get("html_content", "")
                    
                    return {
                        "keyword": keyword,
                        "success": True,
                        "headline": headline,
                        "slug": generate_slug(headline) if headline else generate_slug(keyword),
                        "html_content": html_content,
                        "word_count": len(html_content.split()) if html_content else 0,
                    }
                except Exception as e:
                    return {
                        "keyword": keyword,
                        "success": False,
                        "error": str(e),
                        "headline": "",
                        "slug": generate_slug(keyword),
                        "html_content": "",
                        "word_count": 0,
                    }
            
            # Create tasks for parallel execution with staggered start
            import asyncio
            tasks = []
            for idx, kw_data in enumerate(request.batch_keywords):
                task = asyncio.create_task(generate_single_blog(idx, kw_data))
                tasks.append(task)
                # Add small delay between task creation to avoid overwhelming API
                if idx < len(request.batch_keywords) - 1:
                    await asyncio.sleep(2)  # 2 second stagger between starts
            
            # Execute all blogs in parallel (they'll start at slightly different times)
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Convert exceptions to error results
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    kw_data = request.batch_keywords[i]
                    processed_results.append({
                        "keyword": kw_data.get('keyword', ''),
                        "success": False,
                        "error": str(result),
                        "headline": "",
                        "slug": generate_slug(kw_data.get('keyword', '')),
                        "html_content": "",
                        "word_count": 0,
                    })
                else:
                    processed_results.append(result)
            
            results = processed_results
            
            return {
                "success": True,
                "batch_mode": True,
                "results": results,
                "total": len(results),
            }
        
        # Single blog mode
        # Generate job ID
        job_id = f"local-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{request.primary_keyword[:20]}"
        
        # Build job config (EXACTLY as api.py does)
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
        if request.sitemap_urls:
            job_config["sitemap_urls"] = request.sitemap_urls
        if request.word_count:
            job_config["word_count"] = request.word_count
        if request.tone:
            job_config["tone"] = request.tone
        if request.system_prompts:
            job_config["system_prompts"] = request.system_prompts
        if request.content_generation_instruction:
            job_config["content_generation_instruction"] = request.content_generation_instruction
        if request.batch_siblings:
            job_config["batch_siblings"] = request.batch_siblings
        if request.batch_id:
            job_config["batch_id"] = request.batch_id
        
        # Get engine and execute
        engine = get_engine()
        context = await engine.execute(job_id=job_id, job_config=job_config)
        
        # Calculate duration
        duration = (datetime.now() - start_time).total_seconds()
        
        # Debug: Print context attributes
        print(f"[DEBUG] Has validated_article: {context.validated_article is not None}", file=sys.stderr)
        print(f"[DEBUG] Has final_article: {context.final_article is not None}", file=sys.stderr)
        if context.validated_article:
            print(f"[DEBUG] validated_article keys: {list(context.validated_article.keys())}", file=sys.stderr)
            if 'html_content' in context.validated_article:
                content_len = len(context.validated_article.get('html_content', ''))
                print(f"[DEBUG] validated_article html_content length: {content_len}", file=sys.stderr)
        if context.final_article:
            print(f"[DEBUG] final_article keys: {list(context.final_article.keys())}", file=sys.stderr)
            if 'html_content' in context.final_article:
                content_len = len(context.final_article.get('html_content', ''))
                print(f"[DEBUG] final_article html_content length: {content_len}", file=sys.stderr)
        
        # Build response from context
        # Try multiple sources for data (validated_article, final_article, structured_data)
        headline = ""
        html_content = ""
        word_count = 0
        
        # Get headline from structured_data
        if context.structured_data:
            # Note: Pydantic fields are capitalized (Headline not headline)
            headline = getattr(context.structured_data, 'Headline', None) or \
                      getattr(context.structured_data, 'headline', '') or ""
        
        # Get HTML content from validated_article or final_article
        if context.validated_article:
            html_content = context.validated_article.get("html_content", "")
        elif context.final_article:
            html_content = context.final_article.get("html_content", "")
        
        # Calculate word count
        if html_content:
            word_count = len(html_content.split())
        
        # Get AEO score from quality_report or context
        aeo_score = None
        if hasattr(context, 'quality_report') and context.quality_report:
            aeo_score = getattr(context.quality_report, 'aeo_score', None)
        if aeo_score is None and hasattr(context, 'aeo_score'):
            aeo_score = context.aeo_score
        
        result = {
            "success": True,
            "job_id": job_id,
            "headline": headline,
            "slug": generate_slug(headline) if headline else generate_slug(request.primary_keyword),
            "html_content": html_content,
            "word_count": word_count,
            "read_time_minutes": calculate_read_time(word_count),
            "language": request.language,
            "country": request.country,
            "aeo_score": aeo_score,
            "duration_seconds": duration,
        }
        
        return result
        
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
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
        import traceback
        error_output = {
            "success": False,
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
