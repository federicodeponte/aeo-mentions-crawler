#!/usr/bin/env python3
"""
AEO Mentions Check - Helper Script
Checks company visibility across AI platforms:
- Perplexity (sonar-pro)
- ChatGPT (online search)
- Claude (online search)
- Gemini (online search)
"""

import sys
import json
import os
import asyncio
from typing import List, Dict, Any

# Would need to add the actual implementation from Modal service
# For now, this is the structure

async def check_mentions(company_name: str, queries: List[str], api_keys: Dict[str, str]) -> Dict[str, Any]:
    """
    Check company mentions across AI platforms
    """
    results = {
        "company_name": company_name,
        "total_queries": len(queries),
        "platforms": {
            "perplexity": {"checked": False, "mentions": []},
            "chatgpt": {"checked": False, "mentions": []},
            "claude": {"checked": False, "mentions": []},
            "gemini": {"checked": False, "mentions": []},
        },
        "summary": {
            "total_mentions": 0,
            "primary_mentions": 0,
            "contextual_mentions": 0,
            "competitive_mentions": 0,
        }
    }
    
    # TODO: Implement actual AI platform queries
    # This would use the respective APIs:
    # - Perplexity API
    # - OpenAI API (ChatGPT with search)
    # - Anthropic API (Claude with search)
    # - Google Gemini API (with search)
    
    return results


def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        company_name = input_data.get('company_name')
        queries = input_data.get('queries', [])
        api_keys = input_data.get('api_keys', {})
        
        if not company_name:
            raise ValueError("company_name is required")
        
        # Run async check
        result = asyncio.run(check_mentions(company_name, queries, api_keys))
        
        # Output result to stdout
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        error_output = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

