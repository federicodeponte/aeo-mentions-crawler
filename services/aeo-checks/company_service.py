"""Company Analysis Service - Two-Phase Analysis with Brand Assets

Phase 1: Website-only analysis using url_context (no google_search)
  - Reads the actual website to get verified company identity
  - Extracts company_info, legal_info from the provided URL only
  - Extracts brand_assets (colors, fonts) from CSS/HTML
  
Phase 2: Competitor search using google_search
  - Uses the verified company identity from Phase 1 as anchor
  - Searches for competitors and market insights

Phase 3: Logo detection (integrated logo_detector module)
  - Uses GPT-4o-mini vision to detect company logos
  
This prevents confusing companies with similar names (e.g., cito.vision vs cito.de)

v2: Uses scaile-services OpenRouter gateway for all AI calls (no direct Gemini API)
"""
import os, json, re, logging, httpx, asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from tech_detector import analyze_website_tech
from openlogo import LogoCrawler
from ai_client import AIClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Company Analysis Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Initialize Local AI Client (lazy initialization to avoid import-time errors)
_ai_client = None

def get_ai_client():
    """Get AI client instance (lazy initialization)."""
    global _ai_client
    if _ai_client is None:
        try:
            _ai_client = AIClient()
        except Exception as e:
            logger.error(f"Failed to initialize AI client: {e}")
            raise
    return _ai_client
# Default model for company analysis (quality mode - needs high quality extraction)
# Models
FAST_MODEL = "google/gemini-2.0-flash-001"
FULL_MODEL = "google/gemini-3-pro-preview"
DEFAULT_MODEL = FULL_MODEL


# ==================== Request/Response Models ====================

class MentionsCheckParams(BaseModel):
    """Parameters for triggering the AEO mentions check after company analysis."""
    numQueries: int = 50
    language: str = "english"
    country: str = "US"
    createAeoReport: bool = True
    submitterEmail: str
    mode: str = "fast"
    allPlatforms: bool = True


class CompanyAnalysisRequest(BaseModel):
    website_url: str
    company_name: str
    additional_context: Optional[str] = None
    extract_logo: bool = Field(default=True, description="Whether to extract logo via GPT-4o-mini vision")
    # Async mode fields - when provided, saves results directly to Supabase
    client_id: Optional[str] = Field(default=None, description="Client ID to save results to")
    supabase_url: Optional[str] = Field(default=None, description="Supabase URL for direct DB save")
    supabase_key: Optional[str] = Field(default=None, description="Supabase service role key for DB access")
    # Mentions check trigger - when true, triggers s1-check-aeo-mentions after saving to DB
    trigger_mentions_check: bool = Field(default=False, description="Trigger mentions check after analysis")
    mentions_check_params: Optional[MentionsCheckParams] = Field(default=None, description="Parameters for mentions check")


class CompanyInfo(BaseModel):
    description: str
    industry: str
    target_audience: list[str]
    product_category: Optional[str] = None
    primary_region: Optional[str] = None
    key_features: Optional[list[str]] = None
    services: Optional[list[str]] = None
    products: Optional[list[str]] = None
    pain_points: Optional[list[str]] = None
    use_cases: Optional[list[str]] = None
    customer_problems: Optional[list[str]] = None
    solution_keywords: Optional[list[str]] = None
    value_propositions: Optional[list[str]] = None
    differentiators: Optional[list[str]] = None


class Competitor(BaseModel):
    name: str
    website: Optional[str] = None
    strengths: list[str]
    weaknesses: Optional[list[str]] = None


class LegalInfo(BaseModel):
    legal_entity: Optional[str] = None
    legal_name: Optional[str] = None
    address: Optional[str] = None
    locations: Optional[list[str]] = None
    headquarters: Optional[str] = None
    vat_number: Optional[str] = None
    registration_number: Optional[str] = None
    imprint_url: Optional[str] = None
    imprint: Optional[str] = None


class BrandColor(BaseModel):
    hex: str = Field(..., description="Hex color code (e.g., #FF5733)")
    name: Optional[str] = Field(None, description="Color name if identifiable")
    usage: Optional[str] = Field(None, description="Where/how this color is used (e.g., 'primary', 'accent', 'background')")


class BrandFont(BaseModel):
    family: str = Field(..., description="Font family name")
    usage: Optional[str] = Field(None, description="Where this font is used (e.g., 'headings', 'body')")
    weight: Optional[str] = Field(None, description="Font weight if specified")


class LogoInfo(BaseModel):
    url: str = Field(..., description="URL of the detected logo")
    confidence: float = Field(..., description="Confidence score (0-1)")
    description: Optional[str] = Field(None, description="AI-generated description of the logo")
    is_header: bool = Field(default=False, description="Whether logo was found in header/nav")


class BrandAssets(BaseModel):
    colors: List[BrandColor] = Field(default_factory=list, description="Brand colors extracted from website")
    fonts: List[BrandFont] = Field(default_factory=list, description="Fonts used on website")
    logo: Optional[LogoInfo] = Field(None, description="Detected company logo")


class WebsiteTech(BaseModel):
    """Website technology stack and metadata."""
    # CMS/Platform
    cms: Optional[str] = Field(None, description="Detected CMS (wordpress, webflow, framer, shopify, etc.)")
    cms_confidence: Optional[str] = Field(None, description="How CMS was detected")
    
    # Tech Stack
    frameworks: List[str] = Field(default_factory=list, description="Frontend frameworks (react, vue, next.js, etc.)")
    analytics: List[str] = Field(default_factory=list, description="Analytics tools (google-analytics, segment, mixpanel)")
    marketing: List[str] = Field(default_factory=list, description="Marketing tools (hubspot, intercom, mailchimp)")
    payments: List[str] = Field(default_factory=list, description="Payment providers (stripe, paypal)")
    
    # Social Media
    social_links: Dict[str, str] = Field(default_factory=dict, description="Social media links {platform: url}")
    
    # Structured Data
    schema_types: List[str] = Field(default_factory=list, description="Schema.org types found (Organization, Product, etc.)")
    schema_data: Optional[Dict[str, Any]] = Field(None, description="Extracted JSON-LD organization data")
    
    # Contact Info
    emails: List[str] = Field(default_factory=list, description="Contact email addresses")
    phones: List[str] = Field(default_factory=list, description="Phone numbers")
    
    # Content/Blog
    has_blog: bool = Field(default=False, description="Whether a blog section was detected")
    blog_url: Optional[str] = Field(None, description="Blog URL if detected")
    rss_feed: Optional[str] = Field(None, description="RSS feed URL if detected")
    
    # SEO
    meta_title: Optional[str] = Field(None, description="Page title tag")
    meta_description: Optional[str] = Field(None, description="Meta description")
    canonical_url: Optional[str] = Field(None, description="Canonical URL")
    sitemap_url: Optional[str] = Field(None, description="Sitemap URL if detected")
    
    # Language
    primary_language: Optional[str] = Field(None, description="Primary language code (en, de, etc.)")
    available_languages: List[str] = Field(default_factory=list, description="Available language versions")
    
    # Security
    has_ssl: bool = Field(default=True, description="Whether site uses HTTPS")
    cookie_consent: Optional[str] = Field(None, description="Cookie consent platform (onetrust, cookiebot, etc.)")


class CompanyAnalysisResponse(BaseModel):
    company_info: CompanyInfo
    competitors: list[Competitor]
    insights: list[str]
    legal_info: Optional[LegalInfo] = None
    brand_voice: Optional[str] = None
    tone: Optional[str] = None
    brand_assets: Optional[BrandAssets] = None
    website_tech: Optional[WebsiteTech] = None
    analysis_error: Optional[str] = Field(None, description="Error message if analysis was partial or failed")


# ==================== JSON Schemas ====================

COMPANY_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "company_info": {
            "type": "object",
            "properties": {
                "description": {"type": "string"},
                "industry": {"type": "string"},
                "target_audience": {"type": "array", "items": {"type": "string"}},
                "product_category": {"type": "string"},
                "primary_region": {"type": "string"},
                "key_features": {"type": "array", "items": {"type": "string"}},
                "services": {"type": "array", "items": {"type": "string"}},
                "products": {"type": "array", "items": {"type": "string"}},
                "pain_points": {"type": "array", "items": {"type": "string"}},
                "use_cases": {"type": "array", "items": {"type": "string"}},
                "customer_problems": {"type": "array", "items": {"type": "string"}},
                "solution_keywords": {"type": "array", "items": {"type": "string"}},
                "value_propositions": {"type": "array", "items": {"type": "string"}},
                "differentiators": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["description", "industry"]
        },
        "legal_info": {
            "type": "object",
            "properties": {
                "legal_entity": {"type": "string"},
                "legal_name": {"type": "string"},
                "address": {"type": "string"},
                "locations": {"type": "array", "items": {"type": "string"}},
                "headquarters": {"type": "string"},
                "vat_number": {"type": "string"},
                "registration_number": {"type": "string"},
                "imprint_url": {"type": "string"},
                "imprint": {"type": "string"},
            }
        },
        "competitors": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "website": {"type": "string"},
                    "strengths": {"type": "array", "items": {"type": "string"}},
                    "weaknesses": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["name"]
            }
        },
        "insights": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["company_info", "competitors", "insights"]
}

COMPETITORS_SCHEMA = {
    "type": "object",
    "properties": {
        "competitors": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "website": {"type": "string"},
                    "strengths": {"type": "array", "items": {"type": "string"}},
                    "weaknesses": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["name"]
            }
        },
        "insights": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["competitors", "insights"]
}

BRAND_ASSETS_SCHEMA = {
    "type": "object",
    "properties": {
        "colors": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "hex": {"type": "string"},
                    "name": {"type": "string"},
                    "usage": {"type": "string"}
                },
                "required": ["hex"]
            }
        },
        "fonts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "family": {"type": "string"},
                    "usage": {"type": "string"},
                    "weight": {"type": "string"}
                },
                "required": ["family"]
            }
        }
    }
}

# ==================== Helper Functions ====================

def get_domain(url: str) -> str:
    """Extract domain from URL for anchoring"""
    parsed = urlparse(url)
    return parsed.netloc.replace('www.', '')


def build_phase1_prompt(website_url: str, domain: str) -> str:
    """Phase 1: Website-only analysis - NO external search"""
    return f"""You are analyzing the company website at {website_url}.

CRITICAL INSTRUCTIONS:
- Read ONLY the content from {website_url} and its subpages (like /about, /imprint, /impressum, /contact, /legal)
- The domain is {domain} - this is the ONLY company you are analyzing
- Do NOT use any external search results
- Do NOT confuse this company with other companies that may have similar names
- If you cannot find information on the website, leave fields empty or null rather than guessing

Browse these pages on {domain}:
1. Homepage: {website_url}
2. About page (if exists): {website_url}/about or similar
3. Imprint/Legal page: {website_url}/imprint, {website_url}/impressum, {website_url}/legal or similar
4. Contact page (if exists)

Extract and return JSON with ONLY information found on {domain}:
{{
  "company_info": {{
    "description": "what this company does based on their website",
    "industry": "their industry",
    "target_audience": ["who they serve"],
    "product_category": "main product/service category",
    "primary_region": "where they operate",
    "key_features": ["features mentioned"],
    "services": ["services offered"],
    "products": ["products offered"],
    "pain_points": ["customer pain points they address"],
    "use_cases": ["use cases mentioned"],
    "customer_problems": ["problems they solve"],
    "solution_keywords": ["solution-related keywords"],
    "value_propositions": ["their value props"],
    "differentiators": ["what makes them unique"]
  }},
  "legal_info": {{
    "legal_entity": "exact legal name from imprint",
    "legal_name": "registered company name",
    "address": "full address from imprint",
    "locations": ["office locations"],
    "headquarters": "HQ location",
    "vat_number": "VAT/tax ID if found",
    "registration_number": "company registration number",
    "imprint_url": "URL of imprint page",
    "imprint": "key imprint details"
  }},
  "brand_voice": "how they communicate",
  "tone": "tone of their content"
}}

Return ONLY valid JSON. Leave fields as null or empty arrays if not found on {domain}."""


def build_brand_assets_prompt(website_url: str, domain: str) -> str:
    """Prompt for extracting brand colors and fonts from website CSS/HTML."""
    return f"""Analyze the visual styling of the website at {website_url}.

Look at the CSS and HTML of {domain} to extract:

1. BRAND COLORS - Extract the main colors used on the website:
   - Look at CSS variables (--primary-color, --brand-color, etc.)
   - Look at commonly used background colors, text colors, accent colors
   - Look at header/nav styling, buttons, links
   - Focus on distinctive brand colors, not generic black/white/gray unless they're deliberately part of the brand

2. FONTS - Extract the fonts used on the website:
   - Look at font-family declarations in CSS
   - Identify fonts used for headings vs body text
   - Look for @font-face declarations or Google Fonts imports

Return JSON:
{{
  "colors": [
    {{"hex": "#XXXXXX", "name": "color name if known", "usage": "primary/accent/background/text/etc"}}
  ],
  "fonts": [
    {{"family": "Font Name", "usage": "headings/body/accent", "weight": "400/700/etc"}}
  ]
}}

IMPORTANT:
- Return actual hex codes found in CSS, not approximations
- Only include colors that appear to be intentional brand colors
- Limit to 5-8 most important colors
- Limit to 3-5 fonts maximum
- Return ONLY valid JSON"""


def build_phase2_prompt(website_url: str, domain: str, company_summary: str, legal_name: str) -> str:
    """Phase 2: Search for competitors and insights - WITH external search"""
    anchor = legal_name if legal_name else f"the company at {domain}"
    
    return f"""Find competitors and market insights for {anchor}.

VERIFIED COMPANY IDENTITY (from their website {domain}):
{company_summary}

COMPETITOR RESEARCH TASK:
Find 5-8 DIRECT competitors. Prioritize in this order:

1. **Niche competitors** (MOST IMPORTANT):
   - Companies targeting the SAME specific market segment
   - Similar business model and pricing tier
   - Competing for the same customers
   - Examples: If analyzing a "startup job board for DACH region", find OTHER startup job boards, NOT LinkedIn/Indeed

2. **Emerging competitors**:
   - Newer companies in the same space
   - Startups trying to disrupt the same market

3. **Adjacent competitors**:
   - Companies with overlapping features
   - Only include if they directly compete for the same use case

DO NOT include:
- Generic/broad platforms (e.g., LinkedIn, Google, Amazon) unless they have a specific competing product
- Companies in completely different industries
- Companies that are potential partners rather than competitors

For each competitor, identify:
- Their specific strengths in this niche
- Their weaknesses or gaps the analyzed company could exploit

IMPORTANT: 
- Search for competitors OF {anchor}, not companies WITH similar names
- The company website is {website_url} - use this to verify you're finding the right company
- {anchor} operates from {domain} - do not confuse with other companies

Return JSON:
{{
  "competitors": [
    {{"name": "Competitor Name", "website": "their website", "strengths": ["specific strength in this niche"], "weaknesses": ["specific weakness or gap"]}}
  ],
  "insights": ["market insights", "industry trends", "company positioning"]
}}

Return 5-8 competitors. Return ONLY valid JSON."""


# ==================== SCAILE Service Fallbacks ====================

async def call_scaile_url_extract(url: str, prompt: str) -> Optional[str]:
    """Fallback URL extraction using SCAILE service (OpenPull)."""
    try:
        scaile_url = "https://clients--scaile-services-fastapi-app.modal.run/url/extract"
        payload = {
            "url": url,
            "prompt": prompt,
            "timeout": 90  # Increased timeout for URL extraction
        }
        
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:  # Follow Modal 303 redirects
            resp = await client.post(scaile_url, json=payload)
            
        if resp.status_code == 200:
            result = resp.json()
            if result.get("success") and result.get("result", {}).get("extracted_data"):
                # Convert structured data back to text for Gemini processing
                extracted = result["result"]["extracted_data"]
                if isinstance(extracted, dict):
                    # Format as readable text
                    content_parts = []
                    if "title" in extracted:
                        content_parts.append(f"Title: {extracted['title']}")
                    if "content" in extracted:
                        content_parts.append(f"Content: {extracted['content']}")
                    if "description" in extracted:
                        content_parts.append(f"Description: {extracted['description']}")
                    # Add any other fields
                    for key, value in extracted.items():
                        if key not in ["title", "content", "description"] and value:
                            content_parts.append(f"{key.title()}: {value}")
                    return "\n\n".join(content_parts)
                else:
                    return str(extracted)
        
        logger.warning(f"SCAILE URL extract failed: {resp.status_code}")
        return None
        
    except Exception as e:
        logger.warning(f"SCAILE URL extract error: {e}")
        return None


async def call_scaile_search(query: str, country: str = "US") -> Optional[str]:
    """Fallback search using SCAILE SERP service (SearXNG → DataForSEO)."""
    try:
        scaile_url = "https://clients--scaile-services-fastapi-app.modal.run/serp/search"
        payload = {
            "query": query,
            "num_results": 10,
            "country": country.lower(),
            "provider": "auto"  # Prefers free SearXNG, falls back to DataForSEO
        }
        
        async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:  # Follow Modal 303 redirects
            resp = await client.post(scaile_url, json=payload)
            
        if resp.status_code == 200:
            result = resp.json()
            if result.get("success") and result.get("results"):
                # Format search results for Gemini processing
                search_results = []
                for item in result["results"][:8]:  # Limit to top 8 results
                    title = item.get("title", "")
                    snippet = item.get("snippet", "")
                    url = item.get("url", "")
                    if title and snippet:
                        search_results.append(f"**{title}**\n{snippet}\nSource: {url}")
                
                if search_results:
                    return "\n\n---\n\n".join(search_results)
        
        logger.warning(f"SCAILE search failed: {resp.status_code}")
        return None
        
    except Exception as e:
        logger.warning(f"SCAILE search error: {e}")
        return None


async def call_ai(prompt: str, use_search: bool = True, max_retries: int = 3, model: str = None, use_schema: bool = True, custom_schema: dict = None) -> dict:
    """2-Phase company analysis using local AIClient."""
    import re
    
    # Extract URL from prompt
    url_match = re.search(r'https?://[^\s<>"{}|\\^`\[\]]+', prompt)
    website_url = url_match.group(0).rstrip('.,;:)') if url_match else None
    
    ai_model = model or DEFAULT_MODEL
    
    for attempt in range(max_retries):
        if attempt > 0:
            wait_time = 2 ** attempt
            logger.info(f"Retry {attempt}/{max_retries} after {wait_time}s...")
            await asyncio.sleep(wait_time)
        
        try:
            # ===== PHASE 1: AI Research with tools =====
            tools = ["url_context", "google_search"] if use_search else ["url_context"]
            logger.info(f"Phase 1: AI research with {tools} using {ai_model} (Local)")
            
            research_prompt = f"""Analyze the company at {website_url}

You MUST use the url_context tool to read the website at {website_url}.
Do NOT rely on training data - actually fetch and read the live website.

After reading the website, provide a comprehensive analysis covering:
1. Company description (2-3 sentences about what they do)
2. Industry (e.g., EdTech, FinTech, SaaS, E-commerce)
3. Target audience (who are their customers?)
4. Products (main things they SELL - list 2-5 items)
5. Services (professional services if any)  
6. Key features (technical capabilities)
7. Value propositions (what makes them valuable?)
8. Competitors (find 3-5 if possible)

Focus on extracting factual information from the website. Be thorough."""

            logger.info(f"Calling ai_client.complete_with_tools with model={ai_model}, tools={tools}")
            result = await get_ai_client().complete_with_tools(
                messages=[{"role": "user", "content": research_prompt}],
                model=ai_model,
                tools=tools,
                max_iterations=5,
                temperature=0,
                max_tokens=4000
            )
            
            logger.info(f"Phase 1 result keys: {result.keys() if isinstance(result, dict) else 'not a dict'}")
            logger.info(f"Phase 1 result type: {type(result)}")
            
            # Handle both formats: direct dict or response object
            if hasattr(result, 'model_dump'):
                result = result.model_dump()
            
            choice = result.get("choices", [{}])[0]
            research_content = choice.get("message", {}).get("content", "")
            
            # Also check for content in reasoning field (Gemini 3 Pro)
            if not research_content:
                reasoning = choice.get("message", {}).get("reasoning")
                if reasoning:
                    research_content = reasoning if isinstance(reasoning, str) else str(reasoning)
            
            logger.info(f"Phase 1 content length: {len(research_content) if research_content else 0}")
            
            if not research_content:
                logger.warning(f"Phase 1: Empty research response. Full result keys: {list(result.keys()) if isinstance(result, dict) else 'not a dict'}")
                logger.warning(f"Phase 1: Choice keys: {list(choice.keys()) if isinstance(choice, dict) else 'not a dict'}")
                continue
                
            logger.info(f"Phase 1 complete: {len(research_content)} chars")
            
            # ===== PHASE 2: Parse to JSON schema =====
            logger.info(f"Phase 2: Parsing research into JSON schema")
            
            schema = custom_schema if custom_schema else COMPANY_ANALYSIS_SCHEMA
            parse_prompt = f"""Based on this company research, extract structured data following this EXACT JSON structure:

{{
  "company_info": {{
    "description": "...",
    "industry": "...",
    "target_audience": ["..."],
    "products": ["..."],
    "services": ["..."],
    ...
  }},
  "legal_info": {{
    ...
  }},
  "competitors": [
    {{"name": "...", "website": "...", "strengths": ["..."], "weaknesses": ["..."]}}
  ],
  "insights": ["..."]
}}

RESEARCH:
{research_content}

Extract ALL information found in the research into the JSON structure above.
Return ONLY valid JSON matching this structure."""

            parse_response = await get_ai_client().complete(
                messages=[{"role": "user", "content": parse_prompt}],
                model=ai_model,
                response_format={"type": "json_object"},
                temperature=0
            )
            
            # Handle both dict and response object
            if hasattr(parse_response, 'model_dump'):
                parse_result = parse_response.model_dump()
            else:
                parse_result = parse_response
            
            parse_choice = parse_result.get("choices", [{}])[0]
            parse_content = parse_choice.get("message", {}).get("content", "")
            
            if "```json" in parse_content:
                parse_content = parse_content.split("```json")[1].split("```")[0].strip()
            elif "```" in parse_content:
                parse_content = parse_content.split("```")[1].split("```")[0].strip()
            
            if "thought:" in parse_content.lower():
                 json_start = parse_content.find('{')
                 if json_start != -1:
                     parse_content = parse_content[json_start:]
                     
            try:
                parsed_data = json.loads(parse_content)
                # Handle case where AI returns an array instead of object
                if isinstance(parsed_data, list) and len(parsed_data) > 0:
                    parsed_data = parsed_data[0]
                logger.info(f"✅ JSON parsed successfully, keys: {list(parsed_data.keys()) if isinstance(parsed_data, dict) else 'not a dict'}")
                return parsed_data
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error: {e}")
                logger.error(f"Content that failed to parse: {parse_content[:500]}")
                continue
                
        except Exception as e:
            import traceback
            logger.error(f"Analysis failed (attempt {attempt}): {type(e).__name__}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            if attempt == max_retries - 1:
                return {} 
                
    return {}

async def call_gemini(prompt: str, use_search: bool = True, max_retries: int = 3, model: str = None, use_schema: bool = True, custom_schema: dict = None) -> dict:
    """Alias for call_ai."""
    return await call_ai(prompt, use_search, max_retries, model, use_schema, custom_schema)

async def call_gemini_with_scaile_fallbacks(prompt: str, use_search: bool, url_failed: bool, search_failed: bool, model: str = None) -> dict:
    """Legacy fallback."""
    return await call_ai(prompt, use_search, model=model)


def is_data_quality_sufficient(company_info: dict, legal_info: dict, phase_name: str = "Phase 1") -> bool:
    """Check if the extracted data meets minimum quality standards."""
    if not company_info:
        logger.warning(f"❌ {phase_name} quality check: No company_info returned")
        return False
    
    description = company_info.get("description", "").strip()
    industry = company_info.get("industry", "").strip()
    
    # Check for meaningful description (not empty, "N/A", or too short)
    if not description or description.lower() in ["n/a", "na", "unknown", ""] or len(description) < 20:
        logger.warning(f"❌ {phase_name} quality check: Insufficient description: '{description}'")
        return False
    
    # Check for meaningful industry
    if not industry or industry.lower() in ["n/a", "na", "unknown", ""]:
        logger.warning(f"❌ {phase_name} quality check: Missing industry: '{industry}'")
        return False
    
    logger.info(f"✅ {phase_name} quality check: Sufficient data quality")
    return True


async def call_gemini_without_tools(prompt: str, max_retries: int = 2) -> dict:
    """Call AI without tools - uses local AIClient."""
    try:
        ai_client = get_ai_client()
        result = await ai_client.complete(
            messages=[{"role": "user", "content": prompt}],
            model=DEFAULT_MODEL,
            temperature=0,
            response_format={"type": "json_object"}
        )
        if hasattr(result, 'model_dump'):
            result = result.model_dump()
        return result
    except Exception as e:
        logger.warning(f"AI call without tools failed: {e}")
        raise RuntimeError(f"All fallback attempts failed: {e}")


async def fetch_logo(website_url: str) -> Optional[LogoInfo]:
    """Detect company logo using openlogo package (Clearbit → Google Favicon → AI Crawler)."""
    try:
        logger.info(f"🔍 fetch_logo: Starting openlogo crawl for {website_url}...")
        
        # Initialize LogoCrawler with OpenAI API key
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("⚠️  OPENAI_API_KEY not set, logo detection may fail")
            return None
        
        crawler = LogoCrawler(api_key=api_key)
        
        # Use openlogo's three-tier system: Clearbit → Google Favicon → AI Crawler
        # Wrap in timeout to prevent hanging (25s timeout, logo is optional)
        try:
            results = await asyncio.wait_for(
                crawler.crawl_website(website_url),
                timeout=25.0
            )
            logger.info(f"✅ fetch_logo: openlogo completed, found {len(results)} logos")
        except asyncio.TimeoutError:
            logger.warning(f"⏱️  fetch_logo: openlogo timeout after 25s for {website_url}")
            return None
        
        if results:
            # Get the best logo (first result is highest ranked)
            best_logo = results[0]
            return LogoInfo(
                url=best_logo.url,
                confidence=best_logo.confidence,
                description=best_logo.description,
                is_header=best_logo.is_header,
            )
        
        return None
    except Exception as e:
        logger.warning(f"❌ fetch_logo: Logo detection error: {e}")
        import traceback
        logger.warning(traceback.format_exc())
        return None


async def fetch_website_html(website_url: str) -> tuple[Optional[str], str]:
    """Fetch website HTML content.
    
    Returns:
        Tuple of (html_content, final_url after redirects)
    """
    # Realistic browser headers to avoid bot blocking
    # Note: Don't include Accept-Encoding - let httpx handle decompression automatically
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }
    
    try:
        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True, headers=headers) as client:
            resp = await client.get(website_url)
            if resp.status_code == 200:
                return (resp.text, str(resp.url))
            logger.warning(f"Failed to fetch {website_url}: HTTP {resp.status_code}")
            return (None, website_url)
    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching {website_url}")
        return (None, website_url)
    except httpx.RequestError as e:
        logger.warning(f"Request error fetching {website_url}: {type(e).__name__}: {e}")
        return (None, website_url)
    except Exception as e:
        logger.warning(f"Unexpected error fetching website HTML: {type(e).__name__}: {e}")
        return (None, website_url)


async def detect_website_technology(website_url: str) -> Optional[WebsiteTech]:
    """Detect website technology stack from HTML."""
    logger.info(f"🔍 detect_website_technology: Starting for {website_url}...")
    html, final_url = await fetch_website_html(website_url)
    logger.info(f"✅ detect_website_technology: fetch_website_html completed, html: {html is not None}, final_url: {final_url}")
    
    if not html:
        logger.warning(f"⚠️  detect_website_technology: Could not fetch HTML for {website_url}")
        return None
    
    logger.info(f"🔍 detect_website_technology: Analyzing tech for {final_url} (HTML size: {len(html)} bytes)")
    
    try:
        logger.info(f"🔍 detect_website_technology: Calling analyze_website_tech...")
        tech_data = analyze_website_tech(html, final_url)
        logger.info(f"✅ detect_website_technology: analyze_website_tech completed")
        result = WebsiteTech(
            cms=tech_data.get("cms"),
            cms_confidence=tech_data.get("cms_confidence"),
            frameworks=tech_data.get("frameworks", []),
            analytics=tech_data.get("analytics", []),
            marketing=tech_data.get("marketing", []),
            payments=tech_data.get("payments", []),
            social_links=tech_data.get("social_links", {}),
            schema_types=tech_data.get("schema_types", []),
            schema_data=tech_data.get("schema_data"),
            emails=tech_data.get("emails", []),
            phones=tech_data.get("phones", []),
            has_blog=tech_data.get("has_blog", False),
            blog_url=tech_data.get("blog_url"),
            rss_feed=tech_data.get("rss_feed"),
            meta_title=tech_data.get("meta_title"),
            meta_description=tech_data.get("meta_description"),
            canonical_url=tech_data.get("canonical_url"),
            sitemap_url=tech_data.get("sitemap_url"),
            primary_language=tech_data.get("primary_language"),
            available_languages=tech_data.get("available_languages", []),
            has_ssl=tech_data.get("has_ssl", True),
            cookie_consent=tech_data.get("cookie_consent"),
        )
        logger.info(f"Tech detection complete: CMS={result.cms}, frameworks={result.frameworks}")
        return result
    except Exception as e:
        logger.error(f"Technology detection error for {website_url}: {type(e).__name__}: {e}")
        return None


async def save_to_supabase(
    supabase_url: str,
    supabase_key: str,
    client_id: str,
    result: "CompanyAnalysisResponse"
) -> bool:
    """Save analysis results directly to Supabase clients table."""
    try:
        # Build the update payload (matching edge function format)
        payload = {
            "company_info": {
                "description": result.company_info.description,
                "industry": result.company_info.industry,
                "targetAudience": result.company_info.target_audience,
                "productCategory": result.company_info.product_category,
                "primaryRegion": result.company_info.primary_region,
                "keyFeatures": result.company_info.key_features,
                "services": result.company_info.services,
                "products": result.company_info.products,
                "pain_points": result.company_info.pain_points,
                "use_cases": result.company_info.use_cases,
                "customer_problems": result.company_info.customer_problems,
                "solution_keywords": result.company_info.solution_keywords,
                "value_propositions": result.company_info.value_propositions,
                "differentiators": result.company_info.differentiators,
            },
            "competitors": [
                {
                    "name": c.name,
                    "website": c.website,
                    "strengths": c.strengths,
                    "weaknesses": c.weaknesses,
                }
                for c in result.competitors
            ],
            "insights": result.insights,
            "brand_voice": result.brand_voice,
            "tone": result.tone,
            "analysis_status": "completed",
            "analysis_completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Add legal_info if present
        if result.legal_info:
            payload["legal_info"] = {
                "legalEntity": result.legal_info.legal_entity,
                "legalName": result.legal_info.legal_name,
                "address": result.legal_info.address,
                "locations": result.legal_info.locations,
                "headquarters": result.legal_info.headquarters,
                "vatNumber": result.legal_info.vat_number,
                "registrationNumber": result.legal_info.registration_number,
                "imprintUrl": result.legal_info.imprint_url,
                "imprint": result.legal_info.imprint,
            }
        
        # Add brand_assets if present
        if result.brand_assets:
            payload["brand_assets"] = {
                "colors": [{"hex": c.hex, "name": c.name, "usage": c.usage} for c in (result.brand_assets.colors or [])],
                "fonts": [{"family": f.family, "usage": f.usage, "weight": f.weight} for f in (result.brand_assets.fonts or [])],
                "logo": {
                    "url": result.brand_assets.logo.url,
                    "confidence": result.brand_assets.logo.confidence,
                    "description": result.brand_assets.logo.description,
                    "isHeader": result.brand_assets.logo.is_header,
                } if result.brand_assets.logo else None,
            }
        
        # Add website_tech if present
        if result.website_tech:
            payload["website_tech"] = {
                "cms": result.website_tech.cms,
                "cmsConfidence": result.website_tech.cms_confidence,
                "frameworks": result.website_tech.frameworks,
                "analytics": result.website_tech.analytics,
                "marketing": result.website_tech.marketing,
                "payments": result.website_tech.payments,
                "socialLinks": result.website_tech.social_links,
                "schemaTypes": result.website_tech.schema_types,
                "schemaData": result.website_tech.schema_data,
                "emails": result.website_tech.emails,
                "phones": result.website_tech.phones,
                "hasBlog": result.website_tech.has_blog,
                "blogUrl": result.website_tech.blog_url,
                "rssFeed": result.website_tech.rss_feed,
                "metaTitle": result.website_tech.meta_title,
                "metaDescription": result.website_tech.meta_description,
                "canonicalUrl": result.website_tech.canonical_url,
                "sitemapUrl": result.website_tech.sitemap_url,
                "primaryLanguage": result.website_tech.primary_language,
                "availableLanguages": result.website_tech.available_languages,
                "hasSsl": result.website_tech.has_ssl,
                "cookieConsent": result.website_tech.cookie_consent,
            }
        
        # Call Supabase REST API
        url = f"{supabase_url}/rest/v1/clients?id=eq.{client_id}"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.patch(url, json=payload, headers=headers)
            
        if resp.status_code in (200, 204):
            logger.info(f"Successfully saved analysis to Supabase for client {client_id}")
            return True
        else:
            logger.error(f"Failed to save to Supabase: {resp.status_code} - {resp.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error saving to Supabase: {type(e).__name__}: {e}")
        return False


async def trigger_mentions_check(
    supabase_url: str,
    supabase_key: str,
    company_name: str,
    client_id: str,
    params: "MentionsCheckParams"
) -> bool:
    """Trigger the AEO mentions check via Supabase Edge Function."""
    try:
        url = f"{supabase_url}/functions/v1/s1-check-aeo-mentions"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "companyName": company_name,
            "clientId": client_id,
            "numQueries": params.numQueries,
            "language": params.language,
            "country": params.country,
            "createAeoReport": params.createAeoReport,
            "submitterEmail": params.submitterEmail,
            "mode": params.mode,
            "allPlatforms": params.allPlatforms,
        }

        logger.info(f"Triggering mentions check for {company_name} (client {client_id})")

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

        if resp.status_code in (200, 202):
            logger.info(f"Mentions check triggered successfully for {company_name}")
            return True
        else:
            logger.error(f"Failed to trigger mentions check: {resp.status_code} - {resp.text}")
            return False

    except Exception as e:
        logger.error(f"Error triggering mentions check: {type(e).__name__}: {e}")
        return False


# ==================== Parallel Task Helpers ====================

async def call_gemini_competitors(prompt: str) -> dict:
    """Call Gemini for competitor search with both url_context and google_search tools."""
    try:
        result = await call_gemini(prompt, use_search=True)
        
        # Check if we got meaningful competitor data
        competitors = result.get("competitors", [])
        if not competitors:
            logger.warning("No competitors found in Gemini response - this may indicate tool failures")
            
        return result
    except Exception as e:
        logger.warning(f"Competitor search failed: {e}")
        return {"competitors": [], "insights": []}


async def extract_brand_assets_async(website_url: str, domain: str) -> BrandAssets:
    """Extract brand assets (colors, fonts) using native Gemini SDK."""
    from gemini_client import get_gemini_client
    import json
    
    brand_assets = BrandAssets()
    
    try:
        logger.info(f"🎨 Extracting brand assets for {domain} using native Gemini SDK...")
        
        brand_prompt = build_brand_assets_prompt(website_url, domain)
        
        # Use native Gemini SDK (same as company analysis)
        gemini_client = get_gemini_client()
        
        logger.info(f"🔍 Brand: About to call Gemini API...")
        # Call native Gemini SDK with url_context tool
        try:
            response = gemini_client.client.models.generate_content(
                model="gemini-3-pro-preview",
                contents=brand_prompt,
                config={
                    "tools": [
                        {"url_context": {}}  # Only need url_context for CSS/HTML analysis
                    ],
                    "temperature": 0.1,
                    "response_mime_type": "application/json",  # Request JSON output
                }
            )
            logger.info(f"✅ Brand: Gemini API call completed, response type: {type(response)}")
        except Exception as e:
            logger.error(f"❌ Brand: Gemini API call failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
        
        # Parse JSON response
        result_text = response.text
        brand_data = json.loads(result_text)
        
        logger.info(f"✅ Brand assets extracted: {len(brand_data.get('colors', []))} colors, {len(brand_data.get('fonts', []))} fonts")
        
        # Parse colors
        colors_data = brand_data.get("colors", [])
        for color in colors_data:
            if isinstance(color, dict) and color.get("hex"):
                brand_assets.colors.append(BrandColor(
                    hex=color["hex"],
                    name=color.get("name"),
                    usage=color.get("usage"),
                ))
        
        # Parse fonts
        fonts_data = brand_data.get("fonts", [])
        for font in fonts_data:
            if isinstance(font, dict) and font.get("family"):
                brand_assets.fonts.append(BrandFont(
                    family=font["family"],
                    usage=font.get("usage"),
                    weight=font.get("weight"),
                ))
                
    except json.JSONDecodeError as e:
        logger.warning(f"Brand assets JSON parse failed: {e}")
        logger.warning(f"Response text: {response.text[:500] if 'response' in locals() else 'No response'}")
    except Exception as e:
        logger.warning(f"Brand assets extraction failed: {e}")
        import traceback
        logger.warning(traceback.format_exc())
    
    return brand_assets


async def fetch_logo_async(website_url: str) -> Optional[LogoInfo]:
    """Fetch logo asynchronously - wrapper around existing fetch_logo."""
    return await fetch_logo(website_url)


async def detect_website_technology_async(website_url: str) -> Optional[WebsiteTech]:
    """Detect website technology asynchronously - wrapper around existing function."""
    return await detect_website_technology(website_url)


# ==================== API Endpoints ====================

@app.post("/analyze")
async def analyze(request: CompanyAnalysisRequest):
    """Analyze a company's website and return structured data."""
    domain = get_domain(request.website_url)
    logger.info(f"=== Analyzing {domain} (URL: {request.website_url}) [version: graceful-fallback-v4] ===")

    try:
        return await _analyze_internal(request, domain)
    except Exception as e:
        logger.error(f"Unhandled exception in analyze: {type(e).__name__}: {e}")
        # Return a minimal valid response instead of HTTP 500
        return {
            "company_info": {"description": "", "industry": "", "target_audience": []},
            "competitors": [],
            "insights": [],
            "legal_info": None,
            "brand_voice": None,
            "tone": None,
            "brand_assets": None,
            "website_tech": None,
            "analysis_error": f"Analysis failed: {type(e).__name__}: {str(e)}"
        }


async def _analyze_internal_gemini_native(request: CompanyAnalysisRequest, domain: str):
    """Single-phase analysis using native Gemini SDK (no OpenRouter)."""
    logger.info(f"🚀 Starting native Gemini single-phase analysis for {request.company_name}")
    
    from gemini_client import get_gemini_client
    
    # Run Gemini analysis only (logo is completely separate, optional)
    logger.info("⚡ Executing Gemini analysis (brand/assets/tech included)")
    
    import time
    start_time = time.time()
    
    # Main Gemini 3 Pro analysis (includes brand assets and tech)
    gemini_client = get_gemini_client()
    
    try:
        logger.info(f"⏳ [{request.company_name}] Starting Gemini analysis (5min timeout)...")
        gemini_result = await asyncio.wait_for(
            gemini_client.analyze_company(
                website_url=request.website_url,
                company_name=request.company_name,
                schema=COMPANY_ANALYSIS_SCHEMA
            ),
            timeout=300.0
        )
        total_elapsed = time.time() - start_time
        logger.info(f"✅ [{request.company_name}] Gemini analysis completed in {total_elapsed:.1f}s")
        logger.info(f"🔍 [{request.company_name}] Gemini result type: {type(gemini_result)}, keys: {list(gemini_result.keys()) if isinstance(gemini_result, dict) else 'N/A'}")
    except asyncio.TimeoutError:
        elapsed = time.time() - start_time
        logger.error(f"❌ [{request.company_name}] Gemini timeout after {elapsed:.1f}s")
        raise RuntimeError(f"Analysis timeout for {request.company_name}")
    except Exception as e:
        logger.error(f"❌ [{request.company_name}] Gemini exception: {type(e).__name__}: {e}")
        raise
    
    # Logo fetch disabled for now - focus on company analysis first
    logger.info(f"⏭️  [{request.company_name}] Logo: Disabled (will be added later)")
    logo_result = None
    
    # Log which tasks succeeded/failed
    logger.info(f"📊 [{request.company_name}] Task results:")
    logger.info(f"   Gemini: {'✅' if not isinstance(gemini_result, Exception) else '❌'}")
    logger.info(f"   Logo: {'✅' if not isinstance(logo_result, Exception) and logo_result else '❌'}")
    
    # Process Gemini result
    logger.info(f"🔍 Processing Gemini result for {request.company_name}...")
    if isinstance(gemini_result, Exception):
        logger.error(f"❌ Gemini failed: {gemini_result}")
        raise RuntimeError(f"Analysis failed: {gemini_result}")
    
    company_info = gemini_result.get("company_info", {})
    legal_info = gemini_result.get("legal_info", {})
    
    # Fix headquarters if dict
    if legal_info and isinstance(legal_info.get("headquarters"), dict):
        hq = legal_info["headquarters"]
        legal_info["headquarters"] = f"{hq.get('city', '')}, {hq.get('country', '')}".strip(", ")
    
    competitors = gemini_result.get("competitors", [])
    insights = gemini_result.get("insights", [])
    brand_voice = gemini_result.get("brand_voice")
    tone = gemini_result.get("tone")
    
    logger.info(f"✅ Gemini: {len(competitors)} competitors, {len(insights)} insights")
    
    # Extract brand assets from Gemini result
    brand_assets = BrandAssets()
    brand_assets_data = gemini_result.get("brand_assets", {})
    if brand_assets_data:
        # Parse colors
        colors_data = brand_assets_data.get("colors", [])
        for color in colors_data:
            if isinstance(color, dict) and color.get("hex"):
                brand_assets.colors.append(BrandColor(
                    hex=color["hex"],
                    name=color.get("name"),
                    usage=color.get("usage"),
                ))
        # Parse fonts
        fonts_data = brand_assets_data.get("fonts", [])
        for font in fonts_data:
            if isinstance(font, dict) and font.get("family"):
                brand_assets.fonts.append(BrandFont(
                    family=font["family"],
                    usage=font.get("usage"),
                    weight=font.get("weight"),
                ))
        logger.info(f"✅ Brand: {len(brand_assets.colors)} colors, {len(brand_assets.fonts)} fonts from Gemini")
    
    # Extract website tech from Gemini result
    website_tech = None
    website_tech_data = gemini_result.get("website_tech", {})
    if website_tech_data:
        try:
            website_tech = WebsiteTech(
                cms=website_tech_data.get("cms"),
                cms_confidence=website_tech_data.get("cms_confidence", 0.0),
                frameworks=website_tech_data.get("frameworks", []),
                analytics=website_tech_data.get("analytics", []),
                marketing=website_tech_data.get("marketing", []),
                payments=website_tech_data.get("payments", []),
                social_links=website_tech_data.get("social_links", {}),
                schema_types=website_tech_data.get("schema_types", []),
                schema_data=website_tech_data.get("schema_data"),
                emails=website_tech_data.get("emails", []),
                phones=website_tech_data.get("phones", []),
                has_blog=website_tech_data.get("has_blog", False),
                blog_url=website_tech_data.get("blog_url"),
                rss_feed=website_tech_data.get("rss_feed"),
                meta_title=website_tech_data.get("meta_title"),
                meta_description=website_tech_data.get("meta_description"),
                canonical_url=website_tech_data.get("canonical_url"),
                sitemap_url=website_tech_data.get("sitemap_url"),
            )
            logger.info(f"✅ Tech: CMS={website_tech.cms}, Frameworks={len(website_tech.frameworks)}")
        except Exception as e:
            logger.warning(f"⚠️  Failed to parse website_tech from Gemini: {e}")
            website_tech = None
    
    # Process logo (still separate since it needs image detection)
    if request.extract_logo and not isinstance(logo_result, Exception) and logo_result:
        brand_assets.logo = logo_result
        logger.info(f"✅ Logo: {logo_result.url}")
    
    logger.info(f"🎉 Single-phase complete for {request.company_name}")
    
    # Build result
    logger.info(f"📦 Building CompanyAnalysisResponse for {request.company_name}...")
    result = CompanyAnalysisResponse(
        company_info=company_info,
        competitors=competitors,
        insights=insights,
        legal_info=legal_info,
        brand_voice=brand_voice,
        tone=tone,
        brand_assets=brand_assets,
        website_tech=website_tech
    )
    
    # Save to Supabase if requested
    if request.client_id and request.supabase_url and request.supabase_key:
        logger.info(f"💾 Saving to Supabase for client {request.client_id}")
        await save_to_supabase(request.supabase_url, request.supabase_key, request.client_id, result)
    
    logger.info(f"✅ Returning result.model_dump() for {request.company_name}")
    dumped = result.model_dump()
    logger.info(f"✅ Result dumped: {len(dumped)} keys, company_info={'present' if dumped.get('company_info') else 'missing'}")
    return dumped


async def _analyze_internal(request: CompanyAnalysisRequest, domain: str):
    """Internal implementation - routes to native Gemini SDK version."""
    return await _analyze_internal_gemini_native(request, domain)


async def _analyze_internal_openrouter_legacy(request: CompanyAnalysisRequest, domain: str):
    """LEGACY: 2-phase OpenRouter implementation (kept for reference)."""

    # PHASE 1: Website-only analysis (NO google_search)
    # Use max_retries=1 since if url_context fails, it's likely a website-specific issue
    logger.info("Phase 1: Analyzing website directly (no external search)...")
    phase1_prompt = build_phase1_prompt(request.website_url, domain)
    phase1_error = None

    try:
        phase1_data = await call_gemini(phase1_prompt, use_search=False, max_retries=1)
    except Exception as e:
        logger.error(f"Phase 1 failed: {e}")
        phase1_error = str(e)
        phase1_data = {}

    company_info = phase1_data.get("company_info", {})
    legal_info = phase1_data.get("legal_info", {})
    
    # CRITICAL: If Phase 1 completely failed, raise error instead of continuing with empty data
    if phase1_error and not company_info:
        error_msg = f"Phase 1 analysis failed: {phase1_error}"
        logger.error(f"❌ ABORTING: {error_msg}")
        raise RuntimeError(error_msg)

    # DATA QUALITY VALIDATION: Check if Phase 1 returned sufficient data
    data_quality_ok = is_data_quality_sufficient(company_info, legal_info, "Phase 1")
    
    if data_quality_ok:
        desc = company_info.get('description') or 'N/A'
        logger.info(f"Phase 1 complete - Found: {desc[:100]}...")
    else:
        logger.warning(f"Phase 1 data quality insufficient - attempting SCAILE fallbacks")
        
        # Trigger SCAILE fallbacks for insufficient data quality
        try:
            logger.info("🔄 Triggering SCAILE fallbacks due to insufficient Phase 1 data quality")
            fallback_prompt = build_phase1_prompt(request.website_url, domain)
            fallback_data = await call_gemini_with_scaile_fallbacks(
                fallback_prompt, 
                use_search=False,  # Phase 1 doesn't use search
                url_failed=True,   # Assume url_context didn't work well
                search_failed=False
            )
            
            # Use fallback data if it's better quality
            fallback_company_info = fallback_data.get("company_info", {})
            if is_data_quality_sufficient(fallback_company_info, fallback_data.get("legal_info", {}), "SCAILE Fallback"):
                logger.info("✅ SCAILE fallbacks provided better data quality - using fallback data")
                company_info = fallback_company_info
                legal_info = fallback_data.get("legal_info", {})
                phase1_data = fallback_data  # Update full data
                # Clear error status since fallbacks succeeded
                if phase1_error:
                    logger.info("🔄 Clearing Phase 1 error status - fallbacks provided sufficient data")
                    phase1_error = None
            else:
                logger.error("❌ SCAILE fallbacks also returned insufficient data")
                raise RuntimeError("All analysis attempts failed: insufficient data quality from both primary and fallback methods")
                
        except RuntimeError:
            raise  # Re-raise RuntimeError from above
        except Exception as e:
            logger.error(f"SCAILE fallbacks failed: {e}")
            raise RuntimeError(f"All analysis attempts failed: {e}")

    # Build summary for phase 2
    legal_name = legal_info.get("legal_name") or legal_info.get("legal_entity") or request.company_name
    products_services = (company_info.get("products") or []) + (company_info.get("services") or [])
    company_description = company_info.get('description') or 'N/A'
    company_industry = company_info.get('industry') or 'N/A'
    company_summary = f"""- Legal Name: {legal_name}
- Domain: {domain}
- Description: {company_description}
- Industry: {company_industry}
- Products/Services: {', '.join(products_services)[:200] if products_services else 'N/A'}"""
    
    # PHASE 2: Parallel execution of all remaining tasks
    competitors = []
    insights = []
    brand_assets = BrandAssets()
    website_tech = None

    if not phase1_error:
        logger.info(f"Phase 2: Parallel execution - competitors, brand assets, logo, technology...")
        
        # Create all tasks to run in parallel
        tasks = []
        
        # Task 1: Competitor search
        phase2_prompt = build_phase2_prompt(request.website_url, domain, company_summary, legal_name)
        tasks.append(call_gemini_competitors(phase2_prompt))
        
        # Task 2: Brand assets extraction
        tasks.append(extract_brand_assets_async(request.website_url, domain))
        
        # Task 3: Logo detection (if requested)
        if request.extract_logo:
            tasks.append(fetch_logo_async(request.website_url))
        else:
            tasks.append(asyncio.create_task(asyncio.sleep(0)))  # Placeholder
        
        # Task 4: Technology detection
        tasks.append(detect_website_technology_async(request.website_url))
        
        # Execute all tasks in parallel
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            competitors_result, brand_result, logo_result, tech_result = results
            
            # Handle competitors
            if isinstance(competitors_result, Exception):
                logger.warning(f"Competitor search failed: {competitors_result}")
            else:
                competitors = competitors_result.get("competitors", [])
                insights = competitors_result.get("insights", [])
                logger.info(f"Found {len(competitors)} competitors")
            
            # Handle brand assets
            if isinstance(brand_result, Exception):
                logger.warning(f"Brand assets extraction failed: {brand_result}")
            else:
                brand_assets = brand_result
                logger.info(f"Found {len(brand_assets.colors)} colors and {len(brand_assets.fonts)} fonts")
            
            # Handle logo
            if request.extract_logo:
                if isinstance(logo_result, Exception):
                    logger.warning(f"Logo detection failed: {logo_result}")
                elif logo_result:
                    brand_assets.logo = logo_result
                    logger.info(f"Found logo: {logo_result.url} (confidence: {logo_result.confidence:.2f})")
                else:
                    logger.info("No logo detected")
            
            # Handle technology
            if isinstance(tech_result, Exception):
                logger.warning(f"Technology detection failed: {tech_result}")
            else:
                website_tech = tech_result
                if website_tech:
                    logger.info(f"Detected CMS: {website_tech.cms}, Frameworks: {website_tech.frameworks}, Analytics: {website_tech.analytics}")
                    social_links = website_tech.social_links or {}
                    logger.info(f"Social links: {list(social_links.keys())}")
                else:
                    logger.info("No technology detected")
                    
        except Exception as e:
            logger.error(f"Phase 2 parallel execution failed: {e}")
            
    else:
        logger.info("Phase 2: Skipped (Phase 1 failed)")
    
    logger.info(f"Phase 2 complete - Found {len(competitors)} competitors")
    
    result = CompanyAnalysisResponse(
        company_info=CompanyInfo(
            description=company_info.get("description") or "",
            industry=company_info.get("industry") or "",
            target_audience=company_info.get("target_audience") or [],
            product_category=company_info.get("product_category"),
            primary_region=company_info.get("primary_region"),
            key_features=company_info.get("key_features"),
            services=company_info.get("services"),
            products=company_info.get("products"),
            pain_points=company_info.get("pain_points"),
            use_cases=company_info.get("use_cases"),
            customer_problems=company_info.get("customer_problems"),
            solution_keywords=company_info.get("solution_keywords"),
            value_propositions=company_info.get("value_propositions"),
            differentiators=company_info.get("differentiators"),
        ),
        competitors=[
            Competitor(
                name=c.get("name") or "",
                website=c.get("website"),
                strengths=c.get("strengths") or [],
                weaknesses=c.get("weaknesses")
            ) for c in competitors if c.get("name")  # Filter out entries without names
        ],
        insights=insights,
        legal_info=LegalInfo(
            legal_entity=legal_info.get("legal_entity"),
            legal_name=legal_info.get("legal_name"),
            address=legal_info.get("address"),
            locations=legal_info.get("locations"),
            headquarters=legal_info.get("headquarters"),
            vat_number=legal_info.get("vat_number"),
            registration_number=legal_info.get("registration_number"),
            imprint_url=legal_info.get("imprint_url"),
            imprint=legal_info.get("imprint"),
        ) if legal_info else None,
        brand_voice=phase1_data.get("brand_voice"),
        tone=phase1_data.get("tone"),
        brand_assets=brand_assets if (brand_assets.colors or brand_assets.fonts or brand_assets.logo) else None,
        website_tech=website_tech,
        analysis_error=phase1_error,
    )
    
    # If async mode: save directly to Supabase
    # NOTE: We only reach this point if analysis succeeded (errors raised above)
    if request.client_id and request.supabase_url and request.supabase_key:
        logger.info(f"Async mode: saving results directly to Supabase for client {request.client_id}")
        saved = await save_to_supabase(
            request.supabase_url,
            request.supabase_key,
            request.client_id,
            result,
        )
        if not saved:
            logger.error(f"Failed to save to Supabase for client {request.client_id}")

        # Trigger mentions check if requested (only after successful save)
        if saved and request.trigger_mentions_check and request.mentions_check_params:
            logger.info(f"Triggering mentions check for {request.company_name}")
            await trigger_mentions_check(
                request.supabase_url,
                request.supabase_key,
                request.company_name,
                request.client_id,
                request.mentions_check_params,
            )
    
    # Return as dict for JSON serialization
    return result.model_dump()


@app.get("/test-ai-client")
async def test_ai_client():
    """Test endpoint to verify AI client initialization."""
    try:
        client = get_ai_client()
        # Test simple completion
        result = await client.complete(
            messages=[{"role": "user", "content": "Say 'hello'"}],
            model="google/gemini-2.0-flash-001",
            max_tokens=10
        )
        if hasattr(result, 'model_dump'):
            result_dict = result.model_dump()
        else:
            result_dict = result
        return {
            "success": True,
            "client_type": str(type(client.client)),
            "test_result": result_dict
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "message": "Company Analysis Service is running.",
        "version": "3.0.0",  # v3: standalone with embedded OpenRouter + Gemini
        "backend": "standalone",
        "model": DEFAULT_MODEL,
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),  # For logo detection
        "logo_detection": "integrated",
    }

@app.get("/test-ai")
async def test_ai():
    """Test AI service (local AIClient) with simple call"""
    try:
        ai_client = get_ai_client()
        result = await ai_client.complete(
            messages=[{"role": "user", "content": "Say 'Hello World'"}],
            model=DEFAULT_MODEL,
            max_tokens=20
        )
        if hasattr(result, 'model_dump'):
            result = result.model_dump()
        return {
            "status": 200,
            "body": result,
            "backend": "standalone",
        }
    except Exception as e:
        import traceback
        return {
            "status": 500,
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }


class LogoRequest(BaseModel):
    website_url: str

@app.post("/crawl-logo")
async def crawl_logo(request: LogoRequest):
    """Standalone endpoint for logo detection using openlogo.
    
    Can be called independently to detect logos from any website.
    Uses openlogo's three-tier system: Clearbit → Google Favicon → AI Crawler.
    """
    logger.info(f"Logo crawl request for {request.website_url}")
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(500, "OPENAI_API_KEY not configured")
        
        crawler = LogoCrawler(api_key=api_key)
        results = await crawler.crawl_website(request.website_url)
        
        # Convert to list of dicts for JSON response
        return {
            "logos": [
                {
                    "url": logo.url,
                    "confidence": logo.confidence,
                    "description": logo.description,
                    "page_url": logo.page_url,
                    "is_header": logo.is_header,
                    "rank_score": logo.rank_score,
                }
                for logo in results
            ],
            "best_logo": {
                "url": results[0].url,
                "confidence": results[0].confidence,
                "description": results[0].description,
                "is_header": results[0].is_header,
            } if results else None,
            "website_url": request.website_url,
            "logos_found": len(results),
        }
    except Exception as e:
        logger.error(f"Logo crawl failed: {e}")
        raise HTTPException(500, f"Logo crawl failed: {e}")


@app.get("/test-ai")
async def test_ai():
    """Test AI service (local AIClient) with simple call"""
    try:
        ai_client = get_ai_client()
        result = await ai_client.complete(
            messages=[{"role": "user", "content": "Say 'Hello World'"}],
            model=DEFAULT_MODEL,
            max_tokens=20
        )
        if hasattr(result, 'model_dump'):
            result = result.model_dump()
        return {
            "status": 200,
            "body": result,
            "backend": "standalone",
        }
    except Exception as e:
        return {"error": str(e)}


# Backwards compatibility alias
@app.get("/test-gemini")
async def test_gemini():
    """Alias for test-ai - for backwards compatibility"""
    return await test_ai()


@app.get("/test-tech")
async def test_tech(url: str = "https://www.scaile.tech"):
    """Test tech detection endpoint - useful for debugging HTML fetch and tech detection."""
    try:
        html, final_url = await fetch_website_html(url)
        if not html:
            return {"error": "Failed to fetch HTML", "url": url}
        
        tech_data = analyze_website_tech(html, final_url)
        return {
            "html_length": len(html),
            "final_url": final_url,
            "cms": tech_data.get("cms"),
            "cms_confidence": tech_data.get("cms_confidence"),
            "frameworks": tech_data.get("frameworks"),
            "analytics": tech_data.get("analytics"),
            "has_blog": tech_data.get("has_blog"),
            "blog_url": tech_data.get("blog_url"),
            "meta_title": tech_data.get("meta_title"),
            "primary_language": tech_data.get("primary_language"),
            "social_links": tech_data.get("social_links"),
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}


# ==================== Fire-and-Forget Endpoint ====================

@app.post("/analyze/fire-and-forget")
async def analyze_fire_and_forget(request: CompanyAnalysisRequest, background_tasks: BackgroundTasks):
    """Fire-and-forget company analysis - returns immediately, processes in background.
    
    REQUIRES: client_id, supabase_url, supabase_key to save results.
    Results are saved directly to the clients table when complete.
    
    Uses FastAPI's BackgroundTasks for reliable background execution.
    """
    if not request.client_id or not request.supabase_url or not request.supabase_key:
        raise HTTPException(
            status_code=400, 
            detail="client_id, supabase_url, and supabase_key are required for fire-and-forget mode"
        )
    
    domain = get_domain(request.website_url)
    logger.info(f"Fire-and-forget: Starting background task for {domain}")
    
    # Use FastAPI's BackgroundTasks - runs after response is sent
    background_tasks.add_task(
        _run_fire_and_forget_background,
        request,
        domain,
    )
    
    logger.info(f"Fire-and-forget: Background task queued for {domain}")
    
    return {
        "status": "accepted",
        "message": "Analysis started in background. Results will be saved to clients table.",
        "client_id": request.client_id,
    }


async def _run_fire_and_forget_background(request: CompanyAnalysisRequest, domain: str):
    """Background task for fire-and-forget analysis."""
    try:
        logger.info(f"Background task started for {domain}")
        
        # Run the actual analysis
        result = await _analyze_internal(request, domain)
        response = CompanyAnalysisResponse(**result) if isinstance(result, dict) else result
        
        # Save to Supabase
        saved = await save_to_supabase(
            request.supabase_url,
            request.supabase_key,
            request.client_id,
            response,
        )
        
        # Update status
        status = "completed" if saved else "failed"
        async with httpx.AsyncClient(timeout=10) as client:
            await client.patch(
                f"{request.supabase_url}/rest/v1/clients?id=eq.{request.client_id}",
                json={"analysis_status": status},
                headers={
                    "apikey": request.supabase_key,
                    "Authorization": f"Bearer {request.supabase_key}",
                    "Content-Type": "application/json",
                }
            )
        
        logger.info(f"Background task complete for {domain}: status={status}")
        
        # Trigger mentions check if requested
        if saved and request.trigger_mentions_check and request.mentions_check_params:
            logger.info(f"Triggering mentions check for {domain}")
            await trigger_mentions_check(
                request.supabase_url,
                request.supabase_key,
                request.company_name,
                request.client_id,
                request.mentions_check_params,
            )
            
    except Exception as e:
        logger.error(f"Background task failed for {domain}: {type(e).__name__}: {e}")
        # Update status to failed
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.patch(
                    f"{request.supabase_url}/rest/v1/clients?id=eq.{request.client_id}",
                    json={"analysis_status": "failed"},
                    headers={
                        "apikey": request.supabase_key,
                        "Authorization": f"Bearer {request.supabase_key}",
                        "Content-Type": "application/json",
                    }
                )
        except Exception as update_err:
            logger.error(f"Failed to update status for {domain}: {update_err}")


async def _run_fire_and_forget_inline(request: CompanyAnalysisRequest, domain: str):
    """Inline fallback for local testing (when Modal spawn not available)."""
    try:
        logger.info(f"Inline background: Running analysis for {domain}")
        
        result = await _analyze_internal(request, domain)
        response = CompanyAnalysisResponse(**result) if isinstance(result, dict) else result
        
        saved = await save_to_supabase(
            request.supabase_url,
            request.supabase_key,
            request.client_id,
            response,
        )
        
        if saved:
            logger.info(f"Inline background: Saved analysis for {domain}")
            async with httpx.AsyncClient(timeout=10) as client:
                await client.patch(
                    f"{request.supabase_url}/rest/v1/clients?id=eq.{request.client_id}",
                    json={"analysis_status": "completed"},
                    headers={
                        "apikey": request.supabase_key,
                        "Authorization": f"Bearer {request.supabase_key}",
                        "Content-Type": "application/json",
                    }
                )
                
    except Exception as e:
        logger.error(f"Inline background failed for {domain}: {e}")
