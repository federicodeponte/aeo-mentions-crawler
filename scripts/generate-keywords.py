#!/usr/bin/env python3
"""
Python script to generate keywords using openkeywords library.
Called directly from Next.js API route.
"""

import sys
import json
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='[KEYWORDS:Python] %(message)s')
logger = logging.getLogger(__name__)

# Add openkeyword service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../services/openkeyword-service'))

from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

def main():
    try:
        # Read input from stdin
        input_json = sys.stdin.read()
        logger.info(f"Received input: {len(input_json)} chars")
        input_data = json.loads(input_json)
        
        # Handle both camelCase and snake_case
        company_name = input_data.get('companyName') or input_data.get('company_name', '')
        company_url = input_data.get('companyUrl') or input_data.get('company_url', '')
        target_count = input_data.get('targetCount') or input_data.get('num_keywords', 50)
        api_key = input_data.get('apiKey') or input_data.get('api_key', '')
        
        logger.info(f"Generating keywords for: {company_name}")
        logger.info(f"Target count: {target_count}")
        
        # Convert string arrays to lists if needed
        def parse_list_field(value):
            if isinstance(value, list):
                return value
            if isinstance(value, str):
                return [v.strip() for v in value.split(',') if v.strip()]
            return []
        
        # Extract parameters with type conversion
        products = parse_list_field(input_data.get('products', []))
        services = parse_list_field(input_data.get('services', []))
        competitors = parse_list_field(input_data.get('competitors', []))
        
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
        )
        
        config = GenerationConfig(
            target_count=int(target_count),
            language=input_data.get('language', 'english'),
            region=input_data.get('country', 'us').lower(),
            enable_clustering=True,
            cluster_count=6,
            min_score=40,
            # Enable ALL FREE features
            enable_gemini_serp=True,  # Gemini Google Search for AEO scoring
            enable_trends=False,  # Google Trends (disabled for speed)
            enable_autocomplete=False,  # Google Autocomplete (disabled for speed)
        )
        
        # Initialize generator
        generator = KeywordGenerator(
            gemini_api_key=api_key,
            model='gemini-3-pro-preview'  # CORRECT model name (no .0)
        )
        
        # Generate keywords (async call wrapped)
        import asyncio
        import time
        
        start_time = time.time()
        result = asyncio.run(generator.generate(company_info, config))
        generation_time = time.time() - start_time
        
        # Convert to dict and add metadata for frontend compatibility
        output = result.to_dict()
        output['metadata'] = {
            'company_name': company_name,
            'company_url': company_url,
            'total_keywords': len(output.get('keywords', [])),
            'generation_time': generation_time,
        }
        
        logger.info(f"Generated {len(output.get('keywords', []))} keywords in {generation_time:.1f}s")
        print(json.dumps(output, ensure_ascii=False))
        
    except Exception as e:
        logger.error(f"Error: {type(e).__name__}: {str(e)}")
        error_output = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
