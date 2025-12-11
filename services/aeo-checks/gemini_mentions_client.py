"""
Native Gemini Client for AEO Mentions Checking
Uses Google's Gemini SDK with native tools: googleSearch
Fast, direct approach without OpenRouter
"""
import os
import json
import logging
from typing import Dict, Any, Optional, List
from google import genai

logger = logging.getLogger(__name__)

class GeminiMentionsClient:
    """Native Gemini SDK client for AEO mentions checking."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable required")
        
        # Use genai.Client() API (NOT generativeai.configure)
        self.client = genai.Client(api_key=self.api_key)
        
        logger.info("GeminiMentionsClient initialized with native Gemini SDK")
    
    async def check_mentions(
        self,
        query: str,
        company_name: str
    ) -> Dict[str, Any]:
        """
        Check company mentions for a single query using Gemini with native search.
        
        Args:
            query: Search query to execute
            company_name: Company name to look for in results
            
        Returns:
            Mention analysis with quality scoring
        """
        
        prompt = f"""You are an AI visibility expert analyzing mentions of "{company_name}" in AI search results.

TASK: Search for "{query}" and analyze if {company_name} is mentioned in the results.

SEARCH PROCESS:
1. Use google_search to find information about: "{query}"
2. Carefully analyze ALL search results for mentions of "{company_name}"
3. Look for variations: {company_name.lower()}, {company_name.upper()}, partial matches

ANALYSIS FRAMEWORK:
- **Primary Recommendation** (10 points): "{company_name} is the best" or "I recommend {company_name}" 
- **Top Option** (7 points): "top/leading/best companies include {company_name}" or "{company_name} is among the best"
- **Listed Option** (5 points): {company_name} appears in numbered/bulleted lists of options
- **Mentioned in Context** (3 points): {company_name} mentioned but not specifically recommended
- **Not Mentioned** (0 points): No mention found

SCORING CRITERIA:
- Count total mentions (max 3 per response)
- Detect position in lists (#1 = +2 bonus, #2-3 = +1 bonus)
- Identify mention type and context
- Note any competitor mentions

Return your analysis as JSON:
{{
  "query": "{query}",
  "company_mentioned": true/false,
  "raw_mentions": 0,
  "capped_mentions": 0,
  "quality_score": 0.0,
  "mention_type": "primary_recommendation|top_option|listed_option|mentioned_in_context|none",
  "position": null or number,
  "context_snippet": "relevant text snippet where company was mentioned",
  "competitor_mentions": [{{"name": "competitor", "count": 1}}],
  "search_summary": "brief summary of what search results were about"
}}

Be thorough and accurate. Look for exact matches and reasonable variations of the company name."""

        try:
            logger.info(f"Checking mentions for query: '{query}' (company: {company_name})")
            
            # Use client.models.generate_content with tools in config
            response = self.client.models.generate_content(
                model="gemini-3-pro-preview",  # Latest model
                contents=prompt,
                config={
                    "tools": [
                        {"google_search": {}}  # Native Google Search
                    ],
                    "temperature": 0.1,
                    "response_mime_type": "application/json",  # Request JSON output
                    "max_output_tokens": 2048
                }
            )
            
            # Parse JSON response
            if hasattr(response, 'text') and response.text:
                result_text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and candidate.content:
                    if hasattr(candidate.content, 'parts') and candidate.content.parts:
                        result_text = ''.join(part.text for part in candidate.content.parts if hasattr(part, 'text') and part.text)
                    elif hasattr(candidate.content, 'text'):
                        result_text = candidate.content.text
                    else:
                        result_text = str(candidate.content)
                else:
                    result_text = None
            else:
                result_text = str(response)
            
            if not result_text:
                logger.error(f"❌ No text in Gemini response for query: {query}")
                return self._create_error_response(query, "Empty response from Gemini")
            
            try:
                parsed_result = json.loads(result_text)
                logger.info(f"✅ Mentions check complete for '{query}': {parsed_result.get('mention_type', 'unknown')}")
                return parsed_result
            except json.JSONDecodeError:
                logger.error(f"JSON parse error for query: {query}")
                logger.error(f"Response text: {result_text[:500]}")
                return self._create_error_response(query, "Invalid JSON response")
            
        except Exception as e:
            logger.error(f"Mentions check failed for query '{query}': {e}")
            return self._create_error_response(query, str(e))
    
    def _create_error_response(self, query: str, error: str) -> Dict[str, Any]:
        """Create error response with default structure."""
        return {
            "query": query,
            "company_mentioned": False,
            "raw_mentions": 0,
            "capped_mentions": 0,
            "quality_score": 0.0,
            "mention_type": "none",
            "position": None,
            "context_snippet": f"Error: {error}",
            "competitor_mentions": [],
            "search_summary": "Search failed",
            "error": error
        }


# Global client instance
_gemini_mentions_client = None

def get_gemini_mentions_client() -> GeminiMentionsClient:
    """Get shared Gemini mentions client instance."""
    global _gemini_mentions_client
    if _gemini_mentions_client is None:
        _gemini_mentions_client = GeminiMentionsClient()
    return _gemini_mentions_client