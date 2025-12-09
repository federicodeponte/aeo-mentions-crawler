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

# Add blog-writer (openblog) to path
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
            
            # Generate each blog
            for idx, kw_data in enumerate(request.batch_keywords):
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
                
                results.append({
                    "keyword": keyword,
                    "success": True,
                    "headline": headline,
                    "slug": generate_slug(headline) if headline else generate_slug(keyword),
                    "html_content": html_content,
                    "word_count": len(html_content.split()) if html_content else 0,
                })
            
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
        
        # Extract enhanced data from parallel_results (stages 4-9)
        parallel_results = getattr(context, 'parallel_results', {}) or {}
        
        # Extract citations data (Stage 4)
        citations_data = parallel_results.get('citations', {})
        citations = []
        if isinstance(citations_data, dict):
            # Extract citation list if available (Pydantic CitationList object)
            citations_list_obj = citations_data.get('citations_list')
            if citations_list_obj:
                # Handle Pydantic CitationList model
                if hasattr(citations_list_obj, 'to_dict_list'):
                    citations = citations_list_obj.to_dict_list()
                elif hasattr(citations_list_obj, 'citations'):
                    # Fallback: extract citations attribute
                    citations = [c.model_dump() if hasattr(c, 'model_dump') else c for c in citations_list_obj.citations]
                elif isinstance(citations_list_obj, list):
                    citations = citations_list_obj
        
        # Extract internal links (Stage 5)
        internal_links_data = parallel_results.get('internal_links', {})
        internal_links = []
        if isinstance(internal_links_data, dict):
            # Extract internal links list (Pydantic InternalLinkList object)
            links_list_obj = internal_links_data.get('internal_links_list')
            if links_list_obj:
                # Handle Pydantic InternalLinkList model
                if hasattr(links_list_obj, 'to_dict_list'):
                    internal_links = links_list_obj.to_dict_list()
                elif hasattr(links_list_obj, 'links'):
                    # Fallback: extract links attribute
                    internal_links = [l.model_dump() if hasattr(l, 'model_dump') else l for l in links_list_obj.links]
                elif isinstance(links_list_obj, list):
                    internal_links = links_list_obj
        
        # Extract TOC (Stage 6)
        toc_data = parallel_results.get('toc', {})
        if isinstance(toc_data, dict):
            # Try toc_dict first (actual TOC data), fallback to toc itself
            toc = toc_data.get('toc_dict', toc_data)
        else:
            toc = {}
        
        # Extract metadata (Stage 7)
        metadata_extra = parallel_results.get('metadata', {})
        if isinstance(metadata_extra, dict):
            read_time = metadata_extra.get('read_time', calculate_read_time(word_count))
            publication_date = metadata_extra.get('publication_date', '')
        else:
            read_time = calculate_read_time(word_count)
            publication_date = ''
        
        # Extract FAQ/PAA (Stage 8)
        faq_paa_data = parallel_results.get('faq_paa', {})
        faq_items = []
        paa_items = []
        if isinstance(faq_paa_data, dict):
            # Handle Pydantic FAQList and PAAList objects
            faq_items_obj = faq_paa_data.get('faq_items', [])
            paa_items_obj = faq_paa_data.get('paa_items', [])
            
            # Convert Pydantic objects to dicts
            if hasattr(faq_items_obj, 'to_dict_list'):
                faq_items = faq_items_obj.to_dict_list()
            elif isinstance(faq_items_obj, list):
                faq_items = faq_items_obj
            
            if hasattr(paa_items_obj, 'to_dict_list'):
                paa_items = paa_items_obj.to_dict_list()
            elif isinstance(paa_items_obj, list):
                paa_items = paa_items_obj
        
        # Extract image data (Stage 9)
        image_data = parallel_results.get('image', {})
        image_url = ''
        image_alt_text = ''
        image_prompt = ''
        if isinstance(image_data, dict):
            image_url = image_data.get('image_url', '')
            image_alt_text = image_data.get('image_alt_text', '')
            image_prompt = image_data.get('image_prompt', '')
        
        # Extract meta tags from structured_data
        meta_title = ''
        meta_description = ''
        if context.structured_data:
            meta_title = getattr(context.structured_data, 'Meta_Title', '') or ''
            meta_description = getattr(context.structured_data, 'Meta_Description', '') or ''
        
        result = {
            "success": True,
            "job_id": job_id,
            "headline": headline,
            "slug": generate_slug(headline) if headline else generate_slug(request.primary_keyword),
            "html_content": html_content,
            "word_count": word_count,
            "read_time_minutes": read_time,
            "language": request.language,
            "country": request.country,
            "aeo_score": aeo_score,
            "duration_seconds": duration,
            
            # Enhanced data (NEW)
            "meta_title": meta_title,
            "meta_description": meta_description,
            "citations": citations,
            "citations_count": len(citations),
            "internal_links": internal_links,
            "internal_links_count": len(internal_links),
            "toc": toc,
            "faq": faq_items,
            "faq_count": len(faq_items),
            "paa": paa_items,
            "paa_count": len(paa_items),
            "image_url": image_url,
            "image_alt_text": image_alt_text,
            "image_prompt": image_prompt,
            "publication_date": publication_date,
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
