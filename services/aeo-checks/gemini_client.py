"""
Native Gemini Client for Company Analysis
Uses Google's Gemini SDK with native tools: googleSearch and urlContext
Single-phase analysis with structured JSON output
"""
import os
import json
import logging
from typing import Dict, Any, Optional
from google import genai

logger = logging.getLogger(__name__)

class GeminiCompanyAnalysisClient:
    """Native Gemini SDK client for single-phase company analysis."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable required")
        
        # Use genai.Client() API (NOT generativeai.configure)
        self.client = genai.Client(api_key=self.api_key)
        
        logger.info("GeminiCompanyAnalysisClient initialized with native Gemini SDK")
    
    async def query_mentions_with_search_grounding(
        self,
        query: str,
        company_name: str
    ) -> Dict[str, Any]:
        """Query for company mentions with native search grounding."""
        import time
        start_time = time.time()
        
        try:
            # Enhanced prompt for AEO mentions checking
            prompt = f"""You are analyzing AI platform visibility for the company "{company_name}".

CRITICAL SEARCH LIMIT: You MUST perform EXACTLY 3 searches and then STOP. Do not exceed 3 searches under any circumstances.

Search Strategy:
1. First search: "{query}" (main query)
2. Second search: "{query} {company_name}" (company-specific)
3. Third search: "{query} review comparison" (alternatives/competitors)

After completing EXACTLY 3 searches, provide your analysis based ONLY on those 3 search results.

ANALYSIS REQUIREMENTS:
1. Does {company_name} appear prominently in search results?
2. What is the quality and relevance of mentions?
3. Are there competitive alternatives mentioned instead?
4. What's the overall visibility assessment?

IMPORTANT: Stop searching after the 3rd search. Base your entire analysis on only those 3 searches.
Include specific quotes from your search results to support your analysis."""

            logger.info(f"🔍 [GEMINI] Starting query for '{query}' (company: {company_name})")
            prompt_time = time.time()
            logger.info(f"⏱️  [GEMINI] Prompt preparation: {(prompt_time - start_time)*1000:.1f}ms")
            
            # Use client.models.generate_content with google_search tool
            api_start = time.time()
            logger.info(f"🌐 [GEMINI] Calling API with model=gemini-2.5-flash, tools=[google_search], max_remote_calls=3")
            
            from google.genai import types
            
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[
                        {"google_search": {}}  # Native Google Search
                    ],
                    temperature=0.1,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(
                        maximum_remote_calls=3  # Limit to 3 search calls for speed optimization
                    )
                )
            )
            
            api_end = time.time()
            api_duration = api_end - api_start
            logger.info(f"✅ [GEMINI] API call completed in {api_duration:.2f}s ({api_duration*1000:.0f}ms)")
            
            # Extract response text with timing
            parse_start = time.time()
            logger.info(f"📋 [GEMINI] Parsing response (type: {type(response).__name__})")
            
            if hasattr(response, 'text') and response.text:
                result_text = response.text
                logger.info(f"✅ [GEMINI] Used response.text directly")
            elif hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                logger.info(f"🔍 [GEMINI] Extracting from candidates[0] (type: {type(candidate).__name__})")
                if hasattr(candidate, 'content') and candidate.content:
                    if hasattr(candidate.content, 'parts') and candidate.content.parts:
                        parts_count = len(candidate.content.parts)
                        result_text = ''.join(part.text for part in candidate.content.parts if hasattr(part, 'text') and part.text)
                        logger.info(f"✅ [GEMINI] Extracted from {parts_count} content parts")
                    elif hasattr(candidate.content, 'text'):
                        result_text = candidate.content.text
                        logger.info(f"✅ [GEMINI] Used candidate.content.text")
                    else:
                        result_text = str(candidate.content)
                        logger.info(f"⚠️  [GEMINI] Fallback to str(candidate.content)")
                else:
                    result_text = None
                    logger.warning(f"❌ [GEMINI] No content in candidate")
            else:
                result_text = str(response)
                logger.info(f"⚠️  [GEMINI] Fallback to str(response)")
            
            parse_end = time.time()
            parse_duration = parse_end - parse_start
            total_duration = parse_end - start_time
            
            if not result_text:
                logger.error(f"❌ [GEMINI] Empty result after {total_duration:.2f}s")
                return {
                    "success": False,
                    "error": "Empty response from Gemini",
                    "response": "",
                    "has_search_grounding": True
                }
            
            response_length = len(result_text)
            logger.info(f"✅ [GEMINI] Query complete: {total_duration:.2f}s total ({api_duration:.2f}s API + {parse_duration*1000:.1f}ms parsing)")
            logger.info(f"📊 [GEMINI] Response: {response_length} chars")
            
            # Count mentions of search to estimate search calls made
            search_mentions = result_text.lower().count('search')
            logger.info(f"🔍 [GEMINI] Estimated search activity: {search_mentions} search mentions in response")
            
            return {
                "success": True,
                "response": result_text,
                "has_search_grounding": True,
                "model": "gemini-2.5-flash",
                "search_enabled": True,
                "timing": {
                    "total_duration": total_duration,
                    "api_duration": api_duration,
                    "parse_duration": parse_duration
                }
            }
            
        except Exception as e:
            error_time = time.time()
            error_duration = error_time - start_time
            logger.error(f"❌ [GEMINI] Query failed after {error_duration:.2f}s: {e}")
            import traceback
            logger.error(f"❌ [GEMINI] Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "response": "",
                "has_search_grounding": True,
                "timing": {
                    "error_duration": error_duration
                }
            }
    
    async def analyze_company(
        self,
        website_url: str,
        company_name: str,
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Single-phase company analysis with Gemini 3.0 Pro.
        
        Args:
            website_url: Company website URL
            company_name: Company name
            schema: JSON schema for structured output
            
        Returns:
            Structured JSON response matching schema
        """
        
        prompt = f"""Conduct a comprehensive analysis of {company_name} at {website_url}.

RESEARCH PROCESS:
1. Use url_context to read {website_url} and key pages:
   - Homepage (analyze CSS for colors/fonts)
   - /about or /about-us
   - /contact
   - /imprint or /impressum or /legal
   
   IMPORTANT: When reading the homepage, extract:
   - CSS variables and color declarations (--primary-color, background colors, etc.)
   - Font-family declarations and @font-face rules

2. Use google_search to find external information (run multiple searches):
   - "{company_name} {website_url} reviews" → Reddit, Trustpilot, G2, Capterra
   - "{company_name} reddit" → Reddit discussions
   - "{company_name} customers feedback" → Testimonials, complaints
   - "{company_name} vs competitors" → Competitor comparisons
   - "{company_name} customer problems" → Pain points

EXTRACT COMPREHENSIVE INFORMATION:

**Company Information:**
- Description (2-3 sentences about what they do)
- Industry (EdTech, FinTech, SaaS, E-commerce, etc.)
- Target audience (who are their customers?)
- Products (main things they SELL - be specific)
- Services (professional services they offer)
- Key features (technical capabilities)
- Product category and primary region

**Customer Intelligence (from reviews/external sources):**
- Pain points (customer frustrations from Reddit/reviews - be specific)
- Customer problems (issues their solution addresses - from website AND reviews)
- Use cases (real scenarios from website AND customer stories)
- Value propositions (key value they provide)
- Differentiators (unique aspects from competitor comparisons)
- Solution keywords (terms describing their approach)

**Brand Analysis:**
- Brand voice (communication style - formal/casual, technical/simple)
- Tone (professional/friendly, technical/accessible)
- Brand colors (extract main colors from CSS - hex codes, names, usage)
- Brand fonts (extract fonts from CSS - family names, usage, weights)

**Legal Information (from imprint/legal pages):**
- Legal entity name
- Registered company name  
- Full address
- Office locations
- Headquarters location
- VAT number
- Registration number
- Imprint URL

**Market Intelligence:**
- Competitors (3-5 companies with websites, strengths, weaknesses)
- Industry insights and market trends

Return your findings as valid JSON with these EXACT field names:

Example JSON structure (fill with REAL data, not schema):
{{
  "company_info": {{
    "description": "2-3 sentence description",
    "industry": "EdTech/FinTech/etc",
    "target_audience": ["audience 1", "audience 2"],
    "products": ["product 1", "product 2"],
    "services": ["service 1", "service 2"],
    "key_features": ["feature 1", "feature 2"],
    "product_category": "category",
    "primary_region": "region",
    "pain_points": ["pain 1 from reviews", "pain 2"],
    "customer_problems": ["problem 1", "problem 2"],
    "use_cases": ["use case 1", "use case 2"],
    "value_propositions": ["value 1", "value 2"],
    "differentiators": ["diff 1", "diff 2"],
    "solution_keywords": ["keyword 1", "keyword 2"]
  }},
  "legal_info": {{
    "legal_entity_name": "Name or null",
    "registered_company_name": "Name or null",
    "full_address": "Address or null",
    "office_locations": ["location 1"],
    "headquarters": {{"country": "Country", "city": "City", "region": "Region"}},
    "vat_number": "VAT or null",
    "registration_number": "Reg or null",
    "imprint_url": "URL or null"
  }},
  "brand_voice": "Voice description",
  "tone": "Tone description",
  "brand_assets": {{
    "colors": [{{"hex": "#XXXXXX", "name": "color name", "usage": "primary/accent/background"}}],
    "fonts": [{{"family": "Font Name", "usage": "headings/body", "weight": "400/700"}}]
  }},
  "competitors": [{{"name": "Comp 1", "website": "url", "strengths": ["s1"], "weaknesses": ["w1"]}}],
  "insights": ["insight 1", "insight 2"]
}}

IMPORTANT:
- Use BOTH url_context AND google_search tools
- Extract pain points from REAL customer feedback (Reddit, reviews)
- Find competitors through search comparisons
- Be thorough and specific
- Return ONLY valid JSON with data (NOT the schema structure itself)"""

        try:
            logger.info(f"Analyzing {company_name} at {website_url} with native Gemini tools...")
            
            # Use client.models.generate_content with tools in config
            response = self.client.models.generate_content(
                model="gemini-3-pro-preview",  # Correct model name for v1beta API
                contents=prompt,
                config={
                    "tools": [
                        {"google_search": {}},  # Native Google Search
                        {"url_context": {}}     # Native URL fetching
                    ],
                    "temperature": 0.1,
                    "response_mime_type": "application/json",  # Request JSON output
                }
            )
            
            # Parse JSON response
            # Handle different response structures
            if hasattr(response, 'text') and response.text:
                result_text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                # Extract text from candidates
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
                logger.error(f"❌ No text in Gemini response. Response type: {type(response)}, attributes: {dir(response)}")
                raise ValueError("Gemini API returned empty response")
            
            logger.info(f"🔍 Response text (first 500 chars): {result_text[:500]}")
            parsed_result = json.loads(result_text)
            
            logger.info(f"✅ Analysis complete - {len(parsed_result)} top-level keys")
            logger.info(f"🔍 Parsed keys: {list(parsed_result.keys())}")
            return parsed_result
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Response text: {response.text[:500]}")
            raise
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise


# Global client instance
_gemini_client = None

def get_gemini_client() -> GeminiCompanyAnalysisClient:
    """Get shared Gemini client instance."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiCompanyAnalysisClient()
    return _gemini_client

