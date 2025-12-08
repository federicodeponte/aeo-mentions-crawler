#!/usr/bin/env python3
"""
Python script to generate keywords using openkeywords library.
Called directly from Next.js API route.

ENHANCED VERSION with:
- Company analysis integration (optional)
- Full pipeline with SERP + volume data
- Rich company context fields
- Proper error handling
"""

import sys
import json
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='[KEYWORDS:Python] %(message)s')
logger = logging.getLogger(__name__)

# Add openkeyword service to path
openkeyword_path = os.path.join(os.path.dirname(__file__), '..', 'python-services', 'openkeyword')
sys.path.insert(0, openkeyword_path)

from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

# Check if company analyzer exists (from synced openkeyword repo)
try:
    from openkeywords.company_analyzer import analyze_company
    HAS_COMPANY_ANALYZER = True
    logger.info("✅ Company analyzer available")
except ImportError:
    HAS_COMPANY_ANALYZER = False
    logger.warning("⚠️  Company analyzer not available - using manual context only")

async def run_generation(input_data: dict) -> dict:
    """Run keyword generation with optional company analysis."""
    
    # Handle both camelCase and snake_case
    company_name = input_data.get('companyName') or input_data.get('company_name', '')
    company_url = input_data.get('companyUrl') or input_data.get('company_url', '')
    target_count = input_data.get('targetCount') or input_data.get('num_keywords', 50)
    api_key = input_data.get('apiKey') or input_data.get('api_key', '')
    
    # Check for analyze_first flag
    analyze_first = input_data.get('analyze_first', False) or input_data.get('analyzeFirst', False)
    
    logger.info(f"🎯 Generating keywords for: {company_name}")
    logger.info(f"   Target count: {target_count}")
    logger.info(f"   URL: {company_url}")
    logger.info(f"   Analyze first: {analyze_first}")
    logger.info(f"   Date: {datetime.now().strftime('%B %Y')}")
    
    # Convert string arrays to lists if needed
    def parse_list_field(value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [v.strip() for v in value.split(',') if v.strip()]
        return []
    
    # STEP 1: Optional company analysis (if enabled and URL provided)
    analysis_result = None
    if analyze_first and company_url and HAS_COMPANY_ANALYZER:
        logger.info("🔍 Running company analysis first...")
        try:
            # Set API key for analyzer
            os.environ['GEMINI_API_KEY'] = api_key
            analysis_result = await analyze_company(company_url)
            logger.info(f"✅ Company analysis complete!")
            logger.info(f"   Industry: {analysis_result.get('industry', 'N/A')}")
            logger.info(f"   Products: {len(analysis_result.get('products', []))} found")
            logger.info(f"   Pain points: {len(analysis_result.get('pain_points', []))} found")
        except Exception as e:
            logger.warning(f"⚠️  Company analysis failed: {e}")
            logger.warning("   Continuing with manual context...")
            analysis_result = None
    
    # STEP 2: Build CompanyInfo from analysis OR manual input
    if analysis_result:
        # Use rich context from analysis
        company_info = CompanyInfo(
            name=analysis_result.get('company_name', company_name),
            url=company_url,
            industry=analysis_result.get('industry'),
            description=analysis_result.get('description'),
            products=analysis_result.get('products', []),
            services=analysis_result.get('services', []),
            target_audience=', '.join(analysis_result.get('target_audience', [])) if isinstance(analysis_result.get('target_audience'), list) else analysis_result.get('target_audience'),
            target_location=analysis_result.get('primary_region') or input_data.get('country', 'United States'),
            competitors=[f"https://{c.lower().replace(' ', '')}.com" for c in analysis_result.get('competitors', [])],
            # RICH FIELDS from company analysis
            pain_points=analysis_result.get('pain_points', []),
            customer_problems=analysis_result.get('customer_problems', []),
            use_cases=analysis_result.get('use_cases', []),
            value_propositions=analysis_result.get('value_propositions', []),
            differentiators=analysis_result.get('differentiators', []),
            key_features=analysis_result.get('key_features', []),
            solution_keywords=analysis_result.get('solution_keywords', []),
            brand_voice=analysis_result.get('brand_voice')
        )
        logger.info("✅ Using rich company context from analysis")
    else:
        # Use manual input (legacy mode)
        products = parse_list_field(input_data.get('products', []))
        services = parse_list_field(input_data.get('services', []))
        competitors = parse_list_field(input_data.get('competitors', []))
        pain_points = parse_list_field(input_data.get('pain_points', []))
        value_propositions = parse_list_field(input_data.get('value_propositions', []))
        use_cases = parse_list_field(input_data.get('use_cases', []))
        
        company_info = CompanyInfo(
            name=company_name,
            url=company_url,
            industry=input_data.get('industry'),
            description=input_data.get('description'),
            services=services,
            products=products,
            target_audience=input_data.get('targetAudience') or input_data.get('target_audience'),
            target_location=input_data.get('targetLocation') or input_data.get('country', 'United States'),
            competitors=competitors,
            # Rich fields from manual input
            pain_points=pain_points,
            value_propositions=value_propositions,
            use_cases=use_cases,
        )
        logger.info("⚠️  Using manual company context (consider enabling company analysis for better results)")
    
    # STEP 3: Configure generation (FULL PIPELINE)
    config = GenerationConfig(
        target_count=int(target_count),
        language=input_data.get('language', 'english'),
        region=input_data.get('country', 'us').lower(),
        enable_clustering=True,
        cluster_count=6,
        min_score=40,
        # ENABLE FULL PIPELINE (uses DataForSEO or Gemini)
        enable_serp_analysis=True,   # Get SERP features, AEO opportunities
        enable_volume_lookup=True,   # Get search volume + difficulty
        # Google Trends & Autocomplete (FREE add-ons, optional)
        enable_google_trends=input_data.get('enable_google_trends', False),
        enable_autocomplete=input_data.get('enable_autocomplete', False),
        autocomplete_expansion_limit=input_data.get('autocomplete_limit', 50),
        # Note: If no DataForSEO API key, Gemini SERP analyzer is used automatically
    )
    
    logger.info("🚀 Starting FULL keyword generation pipeline...")
    logger.info("   ✓ Deep research via Gemini 3 Pro + Google Search grounding")
    logger.info("   ✓ SE Ranking competitor gap analysis")
    logger.info("   ✓ SERP analysis for AEO opportunities")
    logger.info("   ✓ Volume + difficulty lookup")
    if config.enable_autocomplete:
        logger.info("   ✓ Google Autocomplete (real user queries)")
    if config.enable_google_trends:
        logger.info("   ✓ Google Trends (seasonality, rising queries)")
    
    # STEP 4: Generate keywords
    generator = KeywordGenerator(
        gemini_api_key=api_key,
        model='gemini-3-pro-preview'  # Correct model name
    )
    
    import time
    start_time = time.time()
    result = await generator.generate(company_info, config)
    generation_time = time.time() - start_time
    
    # STEP 5: Convert to dict and enhance metadata
    output = result.to_dict()
    output['metadata'] = {
        'company_name': company_name,
        'company_url': company_url,
        'industry': company_info.industry,
        'total_keywords': len(output.get('keywords', [])),
        'generation_time': generation_time,
        'used_company_analysis': analysis_result is not None,
        'generation_date': datetime.now().isoformat(),
        'pipeline': 'full' if config.enable_serp_analysis else 'basic',
    }
    
    logger.info(f"✅ Generated {len(output.get('keywords', []))} keywords in {generation_time:.1f}s")
    if analysis_result:
        logger.info(f"   Used company analysis: YES (industry: {company_info.industry})")
    else:
        logger.info(f"   Used company analysis: NO (manual context)")
    
    return output

def main():
    try:
        # Read input from stdin
        input_json = sys.stdin.read()
        logger.info(f"📥 Received input: {len(input_json)} chars")
        input_data = json.loads(input_json)
        
        # Run async generation
        import asyncio
        output = asyncio.run(run_generation(input_data))
        
        # Output result as JSON
        print(json.dumps(output, ensure_ascii=False))
        
    except Exception as e:
        logger.error(f"❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        error_output = {
            'error': str(e),
            'type': type(e).__name__,
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
