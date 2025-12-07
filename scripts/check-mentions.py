#!/usr/bin/env python3
"""
AEO Mentions Check - Python Script
Calls the mentions service from services/aeo-checks/mentions_service.py

This script is called from Next.js API route via spawn().
Reads JSON from stdin, calls the mentions service, outputs JSON to stdout.
"""

import sys
import json
import os
import asyncio
import logging
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='[MENTIONS:Python] %(message)s')
logger = logging.getLogger(__name__)

# Add services directory to path
services_path = os.path.join(os.path.dirname(__file__), '../../services/aeo-checks')
sys.path.insert(0, services_path)

# Import the mentions service
# Note: We import the function directly, not the FastAPI app
try:
    from mentions_service import check_mentions, MentionsCheckRequest, CompanyAnalysis
except ImportError as e:
    logger.error(f"Failed to import mentions_service: {e}")
    logger.error(f"Services path: {services_path}")
    logger.error(f"Current working directory: {os.getcwd()}")
    raise

def convert_to_python_format(input_data: Dict[str, Any]) -> MentionsCheckRequest:
    """Convert API request format to Python service format."""
    
    # Extract company analysis if present, or create default
    company_analysis = None
    if input_data.get('company_analysis'):
        ca_data = input_data['company_analysis']
        company_analysis = CompanyAnalysis(
            companyInfo=ca_data.get('companyInfo', {}),
            competitors=ca_data.get('competitors', [])
        )
    else:
        # Create default CompanyAnalysis if not provided
        # This is required by MentionsCheckRequest
        company_analysis = CompanyAnalysis(
            companyInfo={
                'name': input_data.get('company_name', ''),
                'website': input_data.get('company_website', ''),
            },
            competitors=[]
        )
    
    # Get API keys
    api_key = input_data.get('api_key') or os.getenv('OPENROUTER_API_KEY', '')
    gemini_api_key = input_data.get('gemini_api_key') or os.getenv('GEMINI_API_KEY', '')
    
    # If no api_key provided, try to get from environment
    if not api_key:
        api_key = os.getenv('OPENROUTER_API_KEY', '')
    
    return MentionsCheckRequest(
        companyName=input_data.get('company_name', ''),
        companyWebsite=input_data.get('company_website', ''),
        companyAnalysis=company_analysis,
        language=input_data.get('language', 'english'),
        country=input_data.get('country', 'US'),
        numQueries=input_data.get('num_queries', 50),
        mode=input_data.get('mode', 'full'),
        generateInsights=False,
        platforms=None,  # Use all platforms
    )

async def run_check(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Run the mentions check asynchronously."""
    try:
        # Convert input to service format
        request = convert_to_python_format(input_data)
        
        # Validate required fields
        if not request.companyName:
            raise ValueError("company_name is required")
        
        # companyAnalysis is always set (default created if not provided)
        # but we can warn if it's minimal
        if not request.companyAnalysis or not request.companyAnalysis.companyInfo:
            logger.warning("Minimal company_analysis provided - results may be limited")
        
        # Set API keys in environment if provided
        if input_data.get('api_key'):
            os.environ['OPENROUTER_API_KEY'] = input_data['api_key']
        if input_data.get('gemini_api_key'):
            os.environ['GEMINI_API_KEY'] = input_data['gemini_api_key']
        
        logger.info(f"Running mentions check for: {request.companyName} (mode: {request.mode})")
        
        # Call the mentions service
        result = await check_mentions(request)
        
        # Convert Pydantic model to dict
        result_dict = result.model_dump() if hasattr(result, 'model_dump') else result.dict()
        
        logger.info(f"Mentions check complete: visibility={result.visibility}%, band={result.band}")
        
        return result_dict
        
    except Exception as e:
        logger.error(f"Mentions check error: {e}", exc_info=True)
        raise

def main():
    """Main entry point - reads from stdin, writes to stdout."""
    try:
        # Read input from stdin
        input_json = sys.stdin.read()
        logger.info(f"Received input: {len(input_json)} chars")
        
        if not input_json:
            raise ValueError("No input provided")
        
        input_data = json.loads(input_json)
        
        # Run async check
        result = asyncio.run(run_check(input_data))
        
        # Output result to stdout as JSON
        print(json.dumps(result, default=str))
        sys.exit(0)
        
    except json.JSONDecodeError as e:
        error_output = {
            "error": f"Invalid JSON input: {str(e)}",
            "type": "JSONDecodeError"
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)
        
    except Exception as e:
        error_output = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_output), file=sys.stderr)
        logger.error(f"Error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
