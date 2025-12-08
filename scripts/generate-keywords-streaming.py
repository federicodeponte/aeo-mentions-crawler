#!/usr/bin/env python3
"""
Keyword generation script with streaming progress updates
Emits JSON progress messages to stdout for real-time UI updates
"""

import sys
import os
import json
import asyncio
import time
from pathlib import Path

# Add openkeyword to Python path
script_dir = Path(__file__).parent
openkeyword_path = script_dir.parent / 'python-services' / 'openkeyword'
sys.path.insert(0, str(openkeyword_path))

from openkeywords.company_analyzer import analyze_company
from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

def emit_progress(stage: str, progress: int, message: str, substage: str = None):
    """Emit progress update to stdout"""
    progress_data = {
        "type": "progress",
        "stage": stage,
        "progress": progress,
        "message": message,
    }
    if substage:
        progress_data["substage"] = substage
    
    # Write to stderr to avoid interfering with JSON output on stdout
    print(json.dumps(progress_data), file=sys.stderr, flush=True)

async def run_generation():
    """Run keyword generation with progress tracking"""
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        api_key = input_data.get('apiKey') or os.getenv('GEMINI_API_KEY')
        if not api_key:
            print(json.dumps({
                "type": "error",
                "error": "No API key provided"
            }), file=sys.stderr, flush=True)
            sys.exit(1)
        
        # Stage 1: Company Analysis (0-15%)
        emit_progress("company_analysis", 0, "Starting company analysis...", "initializing")
        
        company_info = None
        analyze_url = input_data.get('analyze_url')
        
        if analyze_url:
            emit_progress("company_analysis", 5, f"Analyzing {analyze_url}...", "analyzing")
            company_data = await analyze_company(analyze_url, api_key=api_key)
            
            company_info = CompanyInfo(
                name=company_data.get('company_name', input_data.get('company_name', 'Unknown')),
                url=analyze_url,
                industry=company_data.get('industry', input_data.get('industry', '')),
                description=company_data.get('description', input_data.get('description', '')),
                products=company_data.get('products', input_data.get('products', [])),
                services=company_data.get('services', input_data.get('services', [])),
                pain_points=company_data.get('pain_points', input_data.get('pain_points', [])),
                use_cases=company_data.get('use_cases', input_data.get('use_cases', [])),
                competitors=company_data.get('competitors', input_data.get('competitors', [])),
                target_location=company_data.get('primary_region', input_data.get('target_location')),
                target_audience=", ".join(company_data.get('target_audience', [])) if isinstance(company_data.get('target_audience'), list) else company_data.get('target_audience', input_data.get('target_audience', '')),
                brand_voice=company_data.get('brand_voice', input_data.get('brand_voice')),
                solution_keywords=company_data.get('solution_keywords', input_data.get('solution_keywords', [])),
            )
            emit_progress("company_analysis", 15, "Company analysis complete", "complete")
        else:
            # Use provided company info
            company_info = CompanyInfo(
                name=input_data.get('company_name', 'Unknown'),
                url=input_data.get('company_url', ''),
                industry=input_data.get('industry', ''),
                description=input_data.get('description', ''),
                products=input_data.get('products', []),
                services=input_data.get('services', []),
                pain_points=input_data.get('pain_points', []),
                use_cases=input_data.get('use_cases', []),
                competitors=input_data.get('competitors', []),
                target_location=input_data.get('target_location'),
                target_audience=input_data.get('target_audience', ''),
                brand_voice=input_data.get('brand_voice'),
                solution_keywords=input_data.get('solution_keywords', []),
            )
            emit_progress("company_analysis", 15, "Using provided company context", "complete")
        
        # Stage 2: Configuration (15-20%)
        emit_progress("configuration", 15, "Setting up generation config...", "setup")
        
        config = GenerationConfig(
            target_count=input_data.get('target_count', 50),
            min_score=input_data.get('min_score', 70),
            enable_research=input_data.get('enable_research', True),
            enable_serp_analysis=input_data.get('enable_serp_analysis', True),
            min_word_count=input_data.get('min_word_count', 4),
            research_focus=input_data.get('research_focus', False),
            language=input_data.get('language', 'english'),
            region=input_data.get('region', 'us'),
        )
        
        emit_progress("configuration", 20, "Configuration complete", "complete")
        
        # Stage 3: AI Keyword Generation (20-40%)
        emit_progress("ai_generation", 20, "Generating AI keywords...", "generating")
        
        generator = KeywordGenerator(gemini_api_key=api_key)
        
        # Note: We can't intercept internal generator progress easily,
        # so we'll just show stages and estimate timings
        
        emit_progress("ai_generation", 30, "Generating seed keywords...", "seed")
        
        # Run generation (this is where the 7-8 minutes happens)
        start_time = time.time()
        result = await generator.generate(company_info=company_info, config=config)
        generation_time = time.time() - start_time
        
        emit_progress("ai_generation", 40, f"Generated {len(result.keywords)} keywords", "complete")
        
        # Stage 4: Research Phase (40-60%)
        if config.enable_research:
            emit_progress("research", 40, "Researching keywords on forums...", "forums")
            emit_progress("research", 45, "Analyzing Reddit discussions...", "reddit")
            emit_progress("research", 50, "Checking Quora questions...", "quora")
            emit_progress("research", 55, "Extracting niche terms...", "niche")
            emit_progress("research", 60, "Research complete", "complete")
        else:
            emit_progress("research", 60, "Research skipped", "skipped")
        
        # Stage 5: SERP Analysis (60-80%)
        if config.enable_serp_analysis:
            emit_progress("serp_analysis", 60, "Analyzing search results...", "analyzing")
            emit_progress("serp_analysis", 65, "Checking featured snippets...", "snippets")
            emit_progress("serp_analysis", 70, "Analyzing PAA questions...", "paa")
            emit_progress("serp_analysis", 75, "Scoring AEO opportunities...", "scoring")
            emit_progress("serp_analysis", 80, "SERP analysis complete", "complete")
        else:
            emit_progress("serp_analysis", 80, "SERP analysis skipped", "skipped")
        
        # Stage 6: Deduplication (80-90%)
        emit_progress("deduplication", 80, "Removing duplicates...", "semantic")
        emit_progress("deduplication", 85, "Applying semantic analysis...", "analysis")
        emit_progress("deduplication", 90, "Deduplication complete", "complete")
        
        # Stage 7: Clustering (90-95%)
        emit_progress("clustering", 90, "Clustering keywords...", "grouping")
        emit_progress("clustering", 93, "Creating semantic groups...", "semantic")
        emit_progress("clustering", 95, "Clustering complete", "complete")
        
        # Stage 8: Finalization (95-100%)
        emit_progress("finalization", 95, "Preparing results...", "formatting")
        
        # Output final result as JSON to stdout
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
        
        print(json.dumps(output), flush=True)
        emit_progress("finalization", 100, "Complete!", "complete")
        
    except Exception as e:
        import traceback
        error_data = {
            "type": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_data), file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_generation())

