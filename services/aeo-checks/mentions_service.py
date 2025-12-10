"""AEO Mentions Check Service - AI Platform Visibility Analysis

Queries multiple AI platforms (via OpenRouter) to check company visibility:
- Perplexity (sonar-pro) - native search
- Claude (claude-3.5-sonnet) - with google_search tool
- ChatGPT (openai/gpt-4.1) - with google_search tool
- Gemini (gemini-3-pro-preview) - with google_search tool

All platforms use our DataForSEO SERP via scaile-services google_search tool.

Features:
- Quality-adjusted scoring with mention capping (max 3 per response)
- Position detection (#1 in list gets boost)
- Dimension-based query generation (Branded, Service-Specific, etc.)
- Fast mode (10 queries, Gemini + ChatGPT only) vs Full mode (50 queries, all platforms)

v4: GPT-4.1 for ChatGPT, DataForSEO SERP for all platforms
"""

import os
import re
import asyncio
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_client import AIClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AEO Mentions Check Service",
    description="AI platform visibility analysis with quality-adjusted scoring. Uses DataForSEO SERP via local tool.",
    version="4.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Local AI Client (lazy initialization)
_ai_client = None

def get_ai_client():
    """Get AI client instance (lazy initialization)."""
    global _ai_client
    if _ai_client is None:
        _ai_client = AIClient()
    return _ai_client

# AI Platforms with search capabilities (via OpenRouter + DataForSEO SERP)
# All platforms use google_search tool which routes to our DataForSEO SERP
AI_PLATFORMS = {
    "perplexity": {
        "model": "perplexity/sonar-pro",
        "has_search": True,  # Native search built-in
        "needs_tool": False,  # Perplexity has native web search
        "provider": None,
    },
    "claude": {
        "model": "anthropic/claude-3.5-sonnet",
        "has_search": True,
        "needs_tool": True,  # Uses google_search tool → DataForSEO
        "provider": None,
    },
    "chatgpt": {
        "model": "openai/gpt-4.1",  # GPT-4.1 (newer, better reasoning)
        "has_search": True,
        "needs_tool": True,  # Uses google_search tool → DataForSEO
        "provider": "openai",  # Force OpenAI provider (Azure requires BYOK)
    },
    "gemini": {
        "model": "google/gemini-3-pro-preview",
        "has_search": True,
        "needs_tool": True,  # Uses google_search tool → DataForSEO
        "provider": None,
    },
}


# ==================== Request/Response Models ====================

class CompanyAnalysis(BaseModel):
    """Company analysis data for generating targeted queries."""
    companyInfo: Dict[str, Any] = Field(default_factory=dict)
    competitors: List[Dict[str, Any]] = Field(default_factory=list)


class MentionsCheckRequest(BaseModel):
    companyName: str
    companyAnalysis: CompanyAnalysis = Field(
        ...,  # Required field
        description="Company analysis data (required for targeted query generation)"
    )
    language: str = "english"
    country: str = "US"
    numQueries: int = 50
    mode: str = Field(default="full", description="'full' (50 queries, all platforms) or 'fast' (10 queries, Gemini + ChatGPT only)")
    generateInsights: bool = False
    platforms: Optional[List[str]] = None  # If None, use all platforms


class QueryResult(BaseModel):
    query: str
    dimension: str
    platform: str
    raw_mentions: int
    capped_mentions: int
    quality_score: float
    mention_type: str
    position: Optional[int] = None
    source_urls: List[str] = Field(default_factory=list)
    competitor_mentions: List[Dict[str, Any]] = Field(default_factory=list)
    response_text: str = ""


class PlatformStats(BaseModel):
    mentions: int
    quality_score: float
    responses: int
    errors: int
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost: float = 0.0


class DimensionStats(BaseModel):
    mentions: int
    quality_score: float
    queries: int


class TLDRSummary(BaseModel):
    """TL;DR summary with actionable insights and brand confusion detection."""
    visibility_assessment: str
    key_insights: List[str]
    brand_confusion_risk: str
    competitive_positioning: str
    actionable_recommendations: List[str]


class MentionsCheckResponse(BaseModel):
    companyName: str
    visibility: float  # Presence-based visibility score (0-100%)
    band: str  # Dominant/Strong/Moderate/Weak/Minimal
    mentions: int  # Total capped mentions across all responses
    presence_rate: float  # What % of responses mentioned the company (0-100%)
    quality_score: float  # Average quality score when mentioned (0-10)
    max_quality: float  # Maximum possible quality (responses × 10)
    platform_stats: Dict[str, PlatformStats]
    dimension_stats: Dict[str, DimensionStats]
    query_results: List[QueryResult]
    actualQueriesProcessed: int
    execution_time_seconds: float
    total_cost: float
    total_tokens: int
    mode: str
    tldr: TLDRSummary


# ==================== TL;DR Generation Functions ====================

def calculate_brand_confusion_risk(company_name: str, query_results: List[QueryResult]) -> str:
    """Detect potential brand confusion by analyzing response text for similar brand names."""
    import difflib
    
    company_lower = company_name.lower()
    
    # Common brand confusion patterns
    similar_names = []
    for result in query_results:
        response_text = result.response_text
        
        # Extract potential brand names (capitalized words and all-caps words)
        import re
        potential_brands = re.findall(r'\b[A-Z][A-Za-z]*\b', response_text)
        
        for brand in potential_brands:
            brand_lower = brand.lower()
            # Skip common words that aren't brands
            common_words = {'for', 'the', 'and', 'but', 'are', 'is', 'this', 'that', 'with', 'from', 'they', 'have', 'both', 'can', 'may', 'will', 'all', 'any', 'some', 'many', 'more', 'most', 'good', 'best', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important', 'few', 'public', 'bad', 'same', 'able'}
            if brand_lower != company_lower and brand_lower not in common_words and len(brand) >= 3:
                # Check similarity using difflib
                similarity = difflib.SequenceMatcher(None, company_lower, brand_lower).ratio()
                if similarity > 0.7:  # 70% similarity threshold
                    similar_names.append((brand, similarity))
    
    if not similar_names:
        return "Low - clear brand recognition"
    
    # Remove duplicates and sort by similarity
    unique_similar = list(set([name for name, _ in similar_names]))
    if len(unique_similar) == 1:
        return f"Medium - potential confusion with '{unique_similar[0]}'"
    elif len(unique_similar) > 1:
        return f"High - confusion with multiple brands: {', '.join(unique_similar[:3])}"
    
    return "Low - clear brand recognition"


def generate_platform_insights(platform_stats: Dict[str, PlatformStats]) -> List[str]:
    """Generate insights about platform performance."""
    insights = []
    
    # Sort platforms by quality score
    sorted_platforms = sorted(
        platform_stats.items(), 
        key=lambda x: x[1].quality_score if x[1].responses > 0 else 0, 
        reverse=True
    )
    
    if len(sorted_platforms) >= 2:
        best_platform, best_stats = sorted_platforms[0]
        worst_platform, worst_stats = sorted_platforms[-1]
        
        if best_stats.responses > 0:
            insights.append(f"Strongest performance on {best_platform} (quality: {best_stats.quality_score:.1f}/10)")
        
        if worst_stats.responses > 0 and worst_stats.quality_score < best_stats.quality_score:
            insights.append(f"Weakest on {worst_platform} (quality: {worst_stats.quality_score:.1f}/10)")
    
    # Check for platforms with no mentions
    no_mention_platforms = [name for name, stats in platform_stats.items() if stats.mentions == 0]
    if no_mention_platforms:
        if len(no_mention_platforms) == 1:
            insights.append(f"No mentions found on {no_mention_platforms[0]}")
        else:
            insights.append(f"No mentions on {len(no_mention_platforms)} platforms: {', '.join(no_mention_platforms[:2])}")
    
    return insights


def generate_actionable_recommendations(
    visibility: float, 
    band: str, 
    platform_stats: Dict[str, PlatformStats],
    dimension_stats: Dict[str, DimensionStats]
) -> List[str]:
    """Generate specific actionable recommendations."""
    recommendations = []
    
    # Overall visibility recommendations
    if visibility < 20:
        recommendations.append("Critical: Implement comprehensive AEO strategy - visibility is minimal")
    elif visibility < 40:
        recommendations.append("Focus on content optimization for AI search engines")
    elif visibility < 60:
        recommendations.append("Enhance keyword targeting and content depth")
    elif visibility < 80:
        recommendations.append("Fine-tune content for better positioning in AI responses")
    
    # Platform-specific recommendations
    worst_platform = min(platform_stats.items(), key=lambda x: x[1].quality_score if x[1].responses > 0 else -1)
    if worst_platform[1].responses > 0 and worst_platform[1].quality_score < 3:
        recommendations.append(f"Priority: Improve visibility on {worst_platform[0]} - currently underperforming")
    
    # Dimension-specific recommendations
    weak_dimensions = [dim for dim, stats in dimension_stats.items() if stats.quality_score < 3 and stats.queries > 0]
    if weak_dimensions:
        recommendations.append(f"Strengthen {weak_dimensions[0]} content - currently weak performance")
    
    # Geographic recommendations
    if "Geographic" in dimension_stats and dimension_stats["Geographic"].quality_score < 4:
        recommendations.append("Improve geographic-specific content and local SEO")
    
    return recommendations[:4]  # Limit to top 4 recommendations


def generate_tldr_summary(
    company_name: str,
    visibility: float,
    band: str,
    platform_stats: Dict[str, PlatformStats],
    dimension_stats: Dict[str, DimensionStats],
    query_results: List[QueryResult]
) -> TLDRSummary:
    """Generate comprehensive TL;DR summary with actionable insights."""
    
    # Visibility assessment (aligned with band thresholds)
    if visibility >= 80:
        visibility_assessment = f"Excellent AI search visibility ({visibility:.1f}%) - {band.lower()} market presence"
    elif visibility >= 60:
        visibility_assessment = f"Strong AI search visibility ({visibility:.1f}%) - {band.lower()} positioning"
    elif visibility >= 40:
        visibility_assessment = f"Moderate AI search visibility ({visibility:.1f}%) - {band.lower()} presence"
    elif visibility >= 20:
        visibility_assessment = f"Weak AI search visibility ({visibility:.1f}%) - {band.lower()} performance"
    else:
        visibility_assessment = f"Minimal AI search visibility ({visibility:.1f}%) - critical optimization required"
    
    # Generate insights
    key_insights = generate_platform_insights(platform_stats)
    
    # Add dimension insights
    best_dimension = max(dimension_stats.items(), key=lambda x: x[1].quality_score if x[1].queries > 0 else 0)
    if best_dimension[1].queries > 0:
        key_insights.append(f"Best performing content: {best_dimension[0]} queries")
    
    # Ensure minimum insights
    if len(key_insights) < 2:
        key_insights.append(f"Processed {len(query_results)} targeted queries across platforms")
    
    # Brand confusion risk
    brand_confusion_risk = calculate_brand_confusion_risk(company_name, query_results)
    
    # Competitive positioning (simplified - can be enhanced with competitor data)
    total_mentions = sum(stats.mentions for stats in platform_stats.values())
    if total_mentions > 15:
        competitive_positioning = "Strong mention frequency suggests competitive positioning"
    elif total_mentions > 5:
        competitive_positioning = "Moderate mention frequency - room for improvement"
    else:
        competitive_positioning = "Low mention frequency - needs competitive content strategy"
    
    # Actionable recommendations
    actionable_recommendations = generate_actionable_recommendations(
        visibility, band, platform_stats, dimension_stats
    )
    
    return TLDRSummary(
        visibility_assessment=visibility_assessment,
        key_insights=key_insights[:4],  # Limit to top 4 insights
        brand_confusion_risk=brand_confusion_risk,
        competitive_positioning=competitive_positioning,
        actionable_recommendations=actionable_recommendations
    )


# ==================== Quality Scoring Functions ====================

def detect_mention_type(text: str, company_name: str) -> str:
    """Detect mention quality type."""
    text_lower = text.lower()
    company_lower = company_name.lower()

    recommend_patterns = [
        f"recommend {company_lower}",
        f"{company_lower} is the best",
        f"best.*{company_lower}",
        f"{company_lower}.*excellent",
        f"top choice.*{company_lower}"
    ]

    for pattern in recommend_patterns:
        if re.search(pattern, text_lower):
            return 'primary_recommendation'

    # Check for top/leading patterns (more flexible)
    top_patterns = [
        f"(top|leading|best).*{company_lower}",
        f"{company_lower}.*(top|leading|best)",
        f"among.*{company_lower}",
        f"{company_lower}.*among.*the",
    ]
    
    for pattern in top_patterns:
        if re.search(pattern, text_lower):
            return 'top_option'

    if re.search(f"\\d+\\.|\\*.*{company_lower}", text):
        return 'listed_option'

    if company_lower in text_lower:
        return 'mentioned_in_context'

    return 'none'


def detect_list_position(text: str, company_name: str) -> Optional[int]:
    """Detect position in numbered/bulleted lists."""
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if re.search(re.escape(company_name), line, re.IGNORECASE):
            match = re.match(r'^\s*([\d]+)[\.)\s]', line)
            if match:
                return int(match.group(1))
            if re.match(r'^\s*[\*\-\•]', line):
                return i + 1
    return None


def count_mentions(text: str, company_name: str) -> Dict[str, Any]:
    """Count and cap mentions with quality scoring.
    
    Scoring Philosophy:
    - Being mentioned at ALL is valuable (base score)
    - HOW you're mentioned adds bonus points
    - Position in lists adds additional bonus
    - Max score is 10 per response
    
    This produces intuitive visibility percentages:
    - Dominant (70%+): Consistently recommended as top choice
    - Strong (50-70%): Frequently mentioned as top option
    - Moderate (30-50%): Regularly appears in lists
    - Weak (10-30%): Occasionally mentioned
    - Minimal (<10%): Rarely or never mentioned
    """
    raw_mentions = len(re.findall(re.escape(company_name), text, re.IGNORECASE))
    
    if raw_mentions == 0:
        return {
            'raw_mentions': 0,
            'capped_mentions': 0,
            'quality_score': 0.0,
            'mention_type': 'none',
            'position': None,
        }

    capped_mentions = min(raw_mentions, 3)  # Cap at 3
    mention_type = detect_mention_type(text, company_name)
    position = detect_list_position(text, company_name)

    # Base scores by mention type (how valuable is this type of mention?)
    # These are the PRIMARY component of the score
    base_scores = {
        'primary_recommendation': 9.0,   # "I recommend X" - highest value
        'top_option': 7.0,               # "top/leading/best X" - high value
        'listed_option': 5.0,            # Listed among options - medium value
        'mentioned_in_context': 3.0,     # Just mentioned - still valuable
        'none': 0.0,                     # Not mentioned - no value
    }
    base_score = base_scores.get(mention_type, 3.0)

    # Position bonus (additive - rewards being listed first)
    position_bonus = 0.0
    if position:
        if position == 1:
            position_bonus = 2.0   # #1 position is valuable
        elif position <= 3:
            position_bonus = 1.0   # Top 3 is good
        elif position <= 5:
            position_bonus = 0.5   # Top 5 is okay
        # 6+ gets no bonus

    # Multiple mentions bonus (small additive bonus for repeated mentions)
    mention_bonus = min(1.0, (capped_mentions - 1) * 0.5)  # 0, 0.5, or 1.0

    quality_score = min(10.0, base_score + position_bonus + mention_bonus)

    return {
        'raw_mentions': raw_mentions,
        'capped_mentions': capped_mentions,
        'quality_score': round(quality_score, 2),
        'mention_type': mention_type,
        'position': position,
    }


def extract_competitor_mentions(text: str, competitors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract competitor mentions from response."""
    results = []
    for comp in competitors:
        name = comp.get("name", "")
        if name:
            count = len(re.findall(re.escape(name), text, re.IGNORECASE))
            if count > 0:
                results.append({"name": name, "count": count})
    return results


# ==================== Query Generation Helpers ====================

def should_add_geographic_modifier(country: str) -> bool:
    """Smart detection if geographic modifier is needed."""
    if not country:
        return False
    # Skip US and very common countries to avoid cluttered queries
    skip_countries = ['US', 'USA', 'United States', 'Global', 'International']
    return country not in skip_countries

def clean_query_term(term: str) -> str:
    """Clean query terms by removing parentheticals and limiting length."""
    if not term:
        return ""
    # Remove parentheticals like "(AEO)" 
    term = re.sub(r'\([^)]*\)', '', term)
    # Clean slashes: "SaaS / Enterprise" → "SaaS Enterprise"
    term = re.sub(r'\s*/\s*', ' ', term)
    # Limit length and words
    words = term.split()
    if len(words) > 3:  # Max 3 words for clean queries
        term = ' '.join(words[:3])
    if len(term) > 60:  # Max 60 chars
        term = term[:57] + '...'
    return term.strip()

def extract_company_size_from_icp(icp_text: str) -> str:
    """Extract company size from ICP text."""
    if not icp_text:
        return ""
    
    # Pattern matching for size indicators
    icp_lower = icp_text.lower()
    
    # Check for explicit size terms
    if any(term in icp_lower for term in ['startup', 'small business', 'smb']):
        return "startups"
    elif any(term in icp_lower for term in ['enterprise', 'large']):
        return "enterprise companies"
    elif 'mid-size' in icp_lower or 'medium' in icp_lower:
        return "mid-size companies"
    
    # Employee count parsing: "50-500 employees" → "mid-size companies"
    employee_match = re.search(r'(\d+)[-\s]*(\d+)?\s*employees?', icp_lower)
    if employee_match:
        start_count = int(employee_match.group(1))
        if start_count < 50:
            return "small companies"
        elif start_count < 500:
            return "mid-size companies"
        else:
            return "enterprise companies"
    
    return ""

def extract_roles_from_icp(icp_text: str) -> List[str]:
    """Extract roles/personas from ICP text."""
    if not icp_text:
        return []
    
    roles = []
    icp_lower = icp_text.lower()
    
    # Pattern matching for job titles and teams
    role_patterns = [
        # Acronym titles
        r'\b(cmos?|ceos?|ctos?|cfos?)\b',
        # Full job titles
        r'\b(marketing directors?|content managers?|seo managers?|digital marketing managers?)\b',
        # Teams/departments
        r'\b(marketing teams?|content teams?|digital marketing teams?|sales teams?)\b',
        # "For X" patterns
        r'for\s+([\w\s]+?)\s+(?:companies|teams|departments)',
    ]
    
    for pattern in role_patterns:
        matches = re.findall(pattern, icp_text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                match = match[0] if match[0] else match[1] if len(match) > 1 else ""
            
            if match and len(match.strip()) >= 3:
                # Clean and format the role
                role = match.strip()
                if role.upper() in ['CMO', 'CEO', 'CTO', 'CFO']:
                    role = role.upper() + 's'  # CMO → CMOs
                elif not role.endswith('s') and not 'team' in role.lower():
                    # Add plural for job titles: "marketing director" → "marketing directors"
                    if role.lower().endswith('manager'):
                        role = role + 's'
                    else:
                        role = role.title() + 's'
                else:
                    role = role.lower()
                
                if role not in roles and len(role) <= 30:
                    roles.append(role)
    
    # Return top 2 roles to avoid query bloat
    return roles[:2]

def extract_key_phrase_from_sentence(sentence: str) -> str:
    """Extract key searchable phrase from a sentence."""
    if not sentence:
        return ""
    
    # For pain points like "Low AI search visibility" 
    # Extract the core problem: "AI search visibility"
    words = sentence.split()
    
    # Skip common starting words
    skip_words = ['low', 'poor', 'bad', 'lack', 'of', 'no', 'not', 'having']
    start_index = 0
    
    for i, word in enumerate(words):
        if word.lower() not in skip_words:
            start_index = i
            break
    
    # Take key phrase (2-4 words usually)
    key_words = words[start_index:start_index + 4]
    phrase = ' '.join(key_words)
    
    # Clean up
    phrase = clean_query_term(phrase)
    return phrase if len(phrase) >= 3 else sentence

# ==================== Enhanced Query Generation ====================

def generate_queries(
    company_name: str,
    company_analysis: Optional[CompanyAnalysis],
    num_queries: int,
    mode: str,
) -> List[Dict[str, str]]:
    """Generate hyper-niche targeted queries across multiple dimensions."""
    queries = []
    
    # Always include branded queries
    queries.append({"query": company_name, "dimension": "Branded"})
    queries.append({"query": f"{company_name} software", "dimension": "Branded"})
    
    # Extract info from company analysis
    info = {}
    competitors = []
    country = "US"  # Default
    
    if company_analysis and company_analysis.companyInfo:
        info = company_analysis.companyInfo
        country = info.get("country", "US")
        
    if company_analysis and company_analysis.competitors:
        competitors = company_analysis.competitors
    
    # Extract key data with cleaning
    industry = clean_query_term(info.get("industry", ""))
    product_category = clean_query_term(info.get("productCategory", ""))
    products = info.get("products", []) or []
    services = info.get("services", []) or []
    pain_points = info.get("pain_points", []) or []
    icp_text = info.get("target_audience", "") or info.get("icp", "") or ""
    
    # Extract hyper-niche targeting data
    company_size = extract_company_size_from_icp(icp_text)
    roles = extract_roles_from_icp(icp_text)
    use_geo = should_add_geographic_modifier(country)
    geo_suffix = country if use_geo else ""
    
    # Product-specific queries (prioritized - most valuable)
    products_clean = [clean_query_term(p) for p in products[:3] if clean_query_term(p)]
    for product in products_clean:
        if product:
            # Base product queries
            queries.append({"query": product, "dimension": "Product"})
            queries.append({"query": f"best {product}", "dimension": "Product"})
            
            # Hyper-niche product queries
            if geo_suffix:
                queries.append({"query": f"best {product} {geo_suffix}", "dimension": "Product-Geo"})
            if industry:
                queries.append({"query": f"best {product} for {industry}", "dimension": "Product-Industry"})
            if company_size:
                queries.append({"query": f"best {product} for {company_size}", "dimension": "Product-CompanySize"})
            for role in roles:
                queries.append({"query": f"best {product} for {role}", "dimension": "Product-Role"})
    
    # Service-specific queries
    services_clean = [clean_query_term(s) for s in services[:3] if clean_query_term(s)]
    for service in services_clean:
        if service:
            queries.append({"query": f"{service} software", "dimension": "Service-Specific"})
            queries.append({"query": f"best {service} tools", "dimension": "Service-Specific"})
    
    # Industry/vertical queries
    if industry:
        queries.append({"query": f"best {industry} tools", "dimension": "Industry/Vertical"})
        queries.append({"query": f"{industry} solutions", "dimension": "Industry/Vertical"})
    
    # Problem-solution queries (from pain points)
    for pain_point in pain_points[:3]:
        key_phrase = extract_key_phrase_from_sentence(pain_point)
        if key_phrase and len(key_phrase) >= 3:
            queries.append({"query": f"best tools for {key_phrase}", "dimension": "Problem-Solution"})
    
    # Competitive queries
    queries.append({"query": f"{company_name} vs alternatives", "dimension": "Competitive"})
    
    # Add specific competitor comparisons (high-value)
    if competitors:
        main_competitor = competitors[0].get('name', '') if competitors else ''
        if main_competitor:
            comp_clean = clean_query_term(main_competitor)
            if comp_clean:
                queries.append({"query": f"{company_name} vs {comp_clean}", "dimension": "Competitive-Specific"})
    
    # Broad category queries
    if product_category:
        queries.append({"query": f"best {product_category}", "dimension": "Broad Category"})
    
    # Use current year for relevance
    from datetime import datetime
    current_year = datetime.now().year
    queries.append({"query": f"best software tools {current_year}", "dimension": "Broad Category"})
    
    # Remove duplicates while preserving order
    seen = set()
    unique_queries = []
    for q in queries:
        query_lower = q["query"].lower()
        if query_lower not in seen and len(q["query"].strip()) >= 3:
            seen.add(query_lower)
            unique_queries.append(q)
    
    # Limit based on mode
    if mode == "fast":
        return unique_queries[:10]  # Fast mode: 10 queries
    return unique_queries[:num_queries]  # Full mode: 50 queries


# ==================== AI Platform Queries ====================

async def query_platform(
    platform: str,
    query: str,
    model_config: Dict[str, Any],
) -> Dict[str, Any]:
    """Query a single AI platform via local AIClient."""
    model = model_config["model"]
    needs_tool = model_config.get("needs_tool", False)
    provider = model_config.get("provider")
    
    try:
        # Use google_search tool for platforms that need it
        tools = ["google_search"] if needs_tool else None
        
        # Call AI locally
        messages = [{"role": "user", "content": query}]
        
        result = await get_ai_client().complete_with_tools(
            messages=messages,
            model=model,
            tools=tools,
            temperature=0.7,
            max_tokens=1024,
            provider=provider
        )
        
        # Extract response
        choice = result.get("choices", [{}])[0]
        content = choice.get("message", {}).get("content", "")
        
        return {
            "platform": platform,
            "response": content,
            "tokens": result.get("usage", {}).get("total_tokens", 0),
            "cost": 0.0,
        }
            
    except Exception as e:
        logger.error(f"{platform} query error: {e}")
        return {"error": str(e), "platform": platform}


async def query_all_platforms(
    query: str,
    platforms: List[str],
) -> List[Dict[str, Any]]:
    """Query all platforms in parallel."""
    tasks = []
    for platform in platforms:
        if platform in AI_PLATFORMS:
            tasks.append(query_platform(platform, query, AI_PLATFORMS[platform]))
    
    return await asyncio.gather(*tasks, return_exceptions=True)


# ==================== API Endpoints ====================

@app.post("/check", response_model=MentionsCheckResponse)
async def check_mentions(request: MentionsCheckRequest):
    """Run AEO mentions check across AI platforms.
    
    Requires companyAnalysis with industry or products data for targeted query generation.
    Without this data, queries would be too generic to produce meaningful visibility scores.
    """
    import time
    start_time = time.time()
    
    # Validate companyAnalysis has REAL data from company analysis (not just CSV data)
    # This is STRICT validation - we require products/services from actual analysis
    company_info = request.companyAnalysis.companyInfo if request.companyAnalysis else {}
    
    # Get the actual data
    products = company_info.get("products") or []
    services = company_info.get("services") or []
    industry = company_info.get("industry", "")
    description = company_info.get("description", "")
    
    # STRICT: Require products OR services (not just industry from CSV)
    has_products_or_services = bool(products) or bool(services)
    
    # Also check description length - real analysis produces detailed descriptions
    has_detailed_description = len(description) > 100 if description else False
    
    # STRICT validation: Must have products/services from real company analysis
    if not has_products_or_services:
        logger.error(f"Missing REAL company analysis data for {request.companyName} - has_products_or_services=False")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Real company analysis data required",
                "message": "AEO mentions check requires REAL company analysis with products or services data. "
                          "Basic CSV data (industry only) is NOT sufficient for meaningful visibility scores. "
                          "You MUST run company analysis first (/company/analyze), then include the full result.",
                "validation": {
                    "products": len(products) if products else 0,
                    "services": len(services) if services else 0,
                    "industry": industry or "missing",
                    "description_length": len(description) if description else 0,
                },
                "requirement": "At least one product or service from company analysis is required.",
            }
        )
    
    logger.info(f"Starting mentions check for {request.companyName} (mode: {request.mode})")
    
    # Determine platforms to use based on mode
    if request.platforms:
        platforms = request.platforms
    elif request.mode == "fast":
        # Fast mode: only Gemini and ChatGPT (faster, cheaper)
        platforms = ["gemini", "chatgpt"]
    else:
        # Full mode: all platforms
        platforms = list(AI_PLATFORMS.keys())
    
    # Generate queries
    queries = generate_queries(
        request.companyName,
        request.companyAnalysis,
        request.numQueries,
        request.mode,
    )
    logger.info(f"Generated {len(queries)} queries")
    
    # Initialize stats
    platform_stats = {p: PlatformStats(mentions=0, quality_score=0, responses=0, errors=0) for p in platforms}
    dimension_stats: Dict[str, DimensionStats] = {}
    query_results: List[QueryResult] = []
    total_mentions = 0
    total_quality = 0.0
    total_tokens = 0
    total_cost = 0.0
    
    # Get competitors for mention detection
    competitors = []
    if request.companyAnalysis:
        competitors = request.companyAnalysis.competitors
    
    # Initialize dimension stats for all dimensions
    for query_data in queries:
        dimension = query_data["dimension"]
        if dimension not in dimension_stats:
            dimension_stats[dimension] = DimensionStats(mentions=0, quality_score=0, queries=0)
        dimension_stats[dimension].queries += 1
    
    # Process ALL queries in PARALLEL (much faster!)
    async def process_single_query(query_data):
        """Process a single query across all platforms."""
        query = query_data["query"]
        dimension = query_data["dimension"]
        logger.info(f"Querying: '{query}' ({dimension})")
        results = await query_all_platforms(query, platforms)
        return {"query_data": query_data, "results": results}
    
    logger.info(f"Processing {len(queries)} queries in parallel...")
    all_query_results = await asyncio.gather(
        *[process_single_query(q) for q in queries],
        return_exceptions=True
    )
    logger.info(f"All queries completed")
    
    # Process results from all parallel queries
    for query_result in all_query_results:
        if isinstance(query_result, Exception):
            logger.error(f"Query failed: {query_result}")
            continue
        
        query_data = query_result["query_data"]
        results = query_result["results"]
        query = query_data["query"]
        dimension = query_data["dimension"]
        
        for result in results:
            if isinstance(result, Exception):
                continue
            
            platform = result.get("platform", "unknown")
            
            if "error" in result:
                platform_stats[platform].errors += 1
                continue
            
            response_text = result.get("response", "")
            tokens = result.get("tokens", 0)
            cost = result.get("cost", 0.0)
            
            # Count mentions
            mention_data = count_mentions(response_text, request.companyName)
            
            # Extract competitor mentions
            comp_mentions = extract_competitor_mentions(response_text, competitors)
            
            # Create query result
            qr = QueryResult(
                query=query,
                dimension=dimension,
                platform=platform,
                raw_mentions=mention_data["raw_mentions"],
                capped_mentions=mention_data["capped_mentions"],
                quality_score=mention_data["quality_score"],
                mention_type=mention_data["mention_type"],
                position=mention_data["position"],
                competitor_mentions=comp_mentions,
                response_text=response_text[:500],  # Truncate for storage
            )
            query_results.append(qr)
            
            # Update stats
            platform_stats[platform].mentions += mention_data["capped_mentions"]
            platform_stats[platform].quality_score += mention_data["quality_score"]
            platform_stats[platform].responses += 1
            platform_stats[platform].total_tokens += tokens
            platform_stats[platform].cost += cost
            
            dimension_stats[dimension].mentions += mention_data["capped_mentions"]
            dimension_stats[dimension].quality_score += mention_data["quality_score"]
            
            total_mentions += mention_data["capped_mentions"]
            total_quality += mention_data["quality_score"]
            total_tokens += tokens
            total_cost += cost
    
    # Calculate visibility using presence-based formula
    # Visibility = "How often does AI mention this company?" (with quality boost)
    total_responses = sum(s.responses for s in platform_stats.values())
    max_quality = total_responses * 10.0
    
    # Count responses where company was actually mentioned
    responses_with_mentions = sum(1 for qr in query_results if qr.mention_type != 'none')
    
    # Presence rate is the primary factor (what % of queries mention the company?)
    presence_rate = responses_with_mentions / total_responses if total_responses > 0 else 0
    
    # Average quality when mentioned (how well are they mentioned?)
    avg_quality_when_mentioned = total_quality / max(responses_with_mentions, 1) if responses_with_mentions > 0 else 0
    
    # Quality factor: ranges from 0.85 (low quality mentions) to 1.15 (high quality mentions)
    # - Quality 0 → factor 0.85 (presence matters, but poor mentions hurt a bit)
    # - Quality 5 → factor 1.0 (neutral)
    # - Quality 10 → factor 1.15 (excellent mentions boost visibility)
    quality_factor = 0.85 + (avg_quality_when_mentioned / 10) * 0.30
    
    # Visibility = presence rate × quality factor (capped at 100%)
    visibility = min(100.0, presence_rate * quality_factor * 100)
    # Ensure visibility never exceeds 100 (double-check for floating point issues)
    visibility = min(100.0, round(visibility, 1))
    
    # Determine visibility band
    if visibility >= 80:
        band = "Dominant"
    elif visibility >= 60:
        band = "Strong"
    elif visibility >= 40:
        band = "Moderate"
    elif visibility >= 20:
        band = "Weak"
    else:
        band = "Minimal"
    
    # Calculate average quality scores
    for platform in platforms:
        if platform_stats[platform].responses > 0:
            platform_stats[platform].quality_score /= platform_stats[platform].responses
    
    for dimension in dimension_stats:
        if dimension_stats[dimension].queries > 0:
            dimension_stats[dimension].quality_score /= dimension_stats[dimension].queries
    
    execution_time = time.time() - start_time
    
    # Generate TL;DR summary
    tldr_summary = generate_tldr_summary(
        company_name=request.companyName,
        visibility=visibility,
        band=band,
        platform_stats=platform_stats,
        dimension_stats=dimension_stats,
        query_results=query_results
    )
    
    logger.info(f"Mentions check complete: visibility={visibility:.1f}% (presence={presence_rate*100:.1f}%), band={band}, mentions={total_mentions}")
    
    return MentionsCheckResponse(
        companyName=request.companyName,
        visibility=round(visibility, 1),
        band=band,
        mentions=total_mentions,
        presence_rate=round(presence_rate * 100, 1),  # As percentage (0-100)
        quality_score=round(avg_quality_when_mentioned, 2),  # Avg when mentioned (0-10)
        max_quality=max_quality,
        platform_stats=platform_stats,
        dimension_stats=dimension_stats,
        query_results=query_results,
        actualQueriesProcessed=len(queries),
        execution_time_seconds=round(execution_time, 2),
        total_cost=round(total_cost, 4),
        total_tokens=total_tokens,
        mode=request.mode,
        tldr=tldr_summary,
    )


@app.get("/health")
async def health():
    """Service health check."""
    return {
        "status": "healthy",
        "service": "aeo-mentions-check",
        "version": "4.2.0",
        "backend": "scaile-services + DataForSEO SERP",
        "platforms": list(AI_PLATFORMS.keys()),
        "scaile_services_url": SCAILE_SERVICES_URL,
        "search_backend": "DataForSEO SERP via google_search tool",
        "chatgpt_model": "openai/gpt-4.1 via OpenAI",
    }


@app.get("/")
async def root():
    """Service info."""
    return {
        "service": "aeo-mentions-check",
        "version": "4.2.0",
        "endpoints": {
            "/check": "POST - Run mentions check",
            "/health": "GET - Service health",
        },
        "platforms": list(AI_PLATFORMS.keys()),
        "platform_details": {p: {"model": c["model"], "uses_dataforseo": c.get("needs_tool", False)} for p, c in AI_PLATFORMS.items()},
        "modes": {
            "fast": "10 queries, Gemini + ChatGPT only",
            "full": "50 queries, all 4 platforms (Perplexity, Claude, ChatGPT, Gemini)"
        },
        "search_backend": "DataForSEO SERP (via google_search tool)",
    }

