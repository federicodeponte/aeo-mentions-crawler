"""AEO Health Check Service - Comprehensive Website Analysis

v4.0 Overhaul: Tiered Objective Scoring
- Hierarchical gating: AI Access → Schema → Content → Authority
- Blocking all AI crawlers caps score at 10 (not just -15%)
- No schema.org caps score at 45 (AI can't identify entity)
- No more arbitrary weighted averages

FastAPI service that performs 29 checks across 4 categories:
- Technical SEO (16 checks) - core SEO hygiene
- Structured Data Depth (6 checks) - critical for AI understanding
- AI Crawler Access (4 checks) - AI platform accessibility
- Authority/E-E-A-T Signals (3 checks) - focused trust indicators

Scoring Tiers:
- Tier 0 (Critical): AI crawler access, noindex
- Tier 1 (Essential): Organization schema, title, HTTPS
- Tier 2 (Important): Complete schema, content quality
- Tier 3 (Excellence): Full optimization

Endpoint: POST /check
"""

import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from bs4 import BeautifulSoup

from fetcher import fetch_website, FetchResult
from checks.technical import run_technical_checks, extract_technical_summary
from checks.structured_data import (
    run_structured_data_checks, 
    extract_structured_data_summary,
    extract_schema_data
)
from checks.aeo_crawler import run_aeo_crawler_checks, extract_crawler_summary
from checks.authority import run_authority_checks, extract_authority_summary
from scoring import (
    calculate_overall_score,
    calculate_tiered_score,
    calculate_grade,
    calculate_visibility_band,
    calculate_category_clarity_score,
    calculate_entity_strength_score,
    calculate_authority_signal_score,
    count_issues_by_severity,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AEO Health Check Service",
    description="Comprehensive website health analysis for AEO/SEO optimization",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Request/Response Models ===

class HealthCheckRequest(BaseModel):
    url: str = Field(..., description="Website URL to analyze")


class Issue(BaseModel):
    check: str
    category: str
    passed: bool
    severity: str
    message: str
    recommendation: str
    score_impact: int


class TierDetail(BaseModel):
    passed: bool
    cap: int
    reason: str


class TierInfo(BaseModel):
    tier0: TierDetail
    tier1: TierDetail
    tier2: TierDetail
    base_score: float
    limiting_tier: str
    limiting_reason: str


class Summary(BaseModel):
    title: str
    title_length: int
    meta_description: str
    meta_length: int
    word_count: int
    h1_count: int
    images_total: int
    images_with_alt: int
    images_with_descriptive_alt: int
    https: bool
    schema_types: List[str]
    schema_count: int
    schema_completeness: float
    has_organization: bool
    has_faq: bool
    same_as_count: int
    same_as_urls: List[str]
    robots_txt_found: bool
    sitemap_found: bool
    ai_crawlers_allowed: List[str]
    ai_crawlers_blocked: List[str]
    has_about_page: bool
    has_contact_info: bool
    social_links: List[str]
    response_time_ms: int
    js_rendered: bool = False  # Whether JavaScript rendering was used


class HealthCheckResponse(BaseModel):
    url: str
    score: float
    grade: str
    visibility_band: str
    band_color: str
    tier_info: TierInfo  # NEW: Shows what's limiting the score
    categoryClarityScore: int
    entityStrengthScore: int
    authoritySignalScore: int
    total_checks: int
    passed: int
    errors: int
    warnings: int
    notices: int
    issues: List[Issue]
    summary: Summary


# === API Endpoints ===

@app.get("/")
async def root():
    """Service info."""
    return {
        "service": "aeo-health-check",
        "version": "4.0.0",
        "features": [
            "Tiered objective scoring (no arbitrary weights)",
            "Blocking AI crawlers caps score at 10",
            "No schema.org caps score at 45",
            "Playwright JS rendering for SPAs",
            "Cloudflare challenge detection",
        ],
        "endpoints": {
            "/check": "POST - Run comprehensive health check",
            "/health": "GET - Service health status",
        },
        "checks": {
            "technical": 16,
            "structured_data": 6,
            "aeo_crawler": 4,
            "authority": 3,
            "total": 29,
        },
        "scoring_tiers": {
            "tier0_critical": "AI access gate - blocks all AI → max 10",
            "tier1_essential": "Schema gate - no Organization → max 45",
            "tier2_important": "Quality gate - incomplete → max 80",
            "tier3_excellence": "Full optimization → up to 100",
        }
    }


@app.get("/health")
async def health():
    """Service health check."""
    return {"status": "healthy", "service": "aeo-health-check", "version": "4.0.0"}


@app.post("/check", response_model=HealthCheckResponse)
async def check_website(request: HealthCheckRequest):
    """Run comprehensive AEO health check on a website.
    
    v3.0 Overhaul: AEO-focused checks with partial credit scoring.
    
    Performs 29 checks across 4 categories:
    - Technical SEO (16): title, meta, H1, images, HTTPS, canonical, sitemap, hreflang
    - Structured Data (6): schema depth, FAQ, Organization, freshness, JSON-LD validation
    - AI Crawler Access (4): GPTBot, Claude-Web, PerplexityBot, CCBot in robots.txt
    - Authority Signals (3): About page, contact info, social proof
    
    Category weights: structured_data 35%, authority 25%, technical 25%, crawler 15%
    
    Returns scores, grades, issues with recommendations, and detailed summary.
    """
    url = request.url.strip()
    logger.info(f"Health check requested for: {url}")
    
    # Fetch website content and robots.txt
    result = await fetch_website(url)
    
    if result.error or not result.html:
        logger.error(f"Failed to fetch {url}: {result.error}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch website: {result.error}"
        )
    
    # Parse HTML
    soup = BeautifulSoup(result.html, 'lxml')
    
    # Run all checks
    all_issues = []
    
    # 1. Technical SEO checks (16) - includes sitemap, response time, and enhanced robots/canonical checks
    technical_issues = run_technical_checks(
        soup, 
        result.final_url,
        sitemap_found=result.sitemap_found,
        response_time_ms=result.html_response_time_ms  # Use HTML-only response time for scoring
    )
    all_issues.extend(technical_issues)
    logger.info(f"Technical checks complete: {len(technical_issues)} checks")
    
    # 2. Structured data checks (6) - includes JSON-LD validation
    structured_issues = run_structured_data_checks(soup)
    all_issues.extend(structured_issues)
    logger.info(f"Structured data checks complete: {len(structured_issues)} checks")
    
    # Extract schema data early to get sameAs URLs for authority checks
    schema_types, all_schemas, org_schema = extract_schema_data(soup)
    structured_summary = extract_structured_data_summary(soup)
    same_as_urls = structured_summary.get('same_as_urls', [])
    
    # 3. AI crawler access checks (4)
    crawler_issues = run_aeo_crawler_checks(result.robots_txt)
    all_issues.extend(crawler_issues)
    logger.info(f"AI crawler checks complete: {len(crawler_issues)} checks")
    
    # 4. Authority/E-E-A-T checks (3) - pass sameAs URLs for social detection
    authority_issues = run_authority_checks(soup, same_as_urls=same_as_urls)
    all_issues.extend(authority_issues)
    logger.info(f"Authority checks complete: {len(authority_issues)} checks")
    
    # Calculate scores using tiered system
    overall_score, tier_details = calculate_tiered_score(all_issues)
    grade = calculate_grade(overall_score)
    visibility_band, band_color = calculate_visibility_band(overall_score)
    
    # Build tier info for response
    tier_info = TierInfo(
        tier0=TierDetail(**tier_details['tier0']),
        tier1=TierDetail(**tier_details['tier1']),
        tier2=TierDetail(**tier_details['tier2']),
        base_score=tier_details['base_score'],
        limiting_tier=tier_details['limiting_tier'],
        limiting_reason=tier_details['limiting_reason'],
    )
    
    # Calculate component scores (schema data already extracted above)
    category_clarity = calculate_category_clarity_score(soup, schema_types, org_schema)
    entity_strength = calculate_entity_strength_score(
        org_schema, 
        structured_summary['same_as_count'],
        soup
    )
    authority_signal = calculate_authority_signal_score(all_issues)
    
    # Count issues by severity
    severity_counts = count_issues_by_severity(all_issues)
    
    # Build summary
    technical_summary = extract_technical_summary(soup, result.final_url)
    crawler_summary = extract_crawler_summary(result.robots_txt)
    authority_summary = extract_authority_summary(soup, same_as_urls=same_as_urls)
    
    summary = Summary(
        title=technical_summary['title'],
        title_length=technical_summary['title_length'],
        meta_description=technical_summary['meta_description'],
        meta_length=technical_summary['meta_length'],
        word_count=technical_summary['word_count'],
        h1_count=technical_summary['h1_count'],
        images_total=technical_summary['images_total'],
        images_with_alt=technical_summary['images_with_alt'],
        images_with_descriptive_alt=technical_summary['images_with_descriptive_alt'],
        https=technical_summary['https'],
        schema_types=structured_summary['schema_types'],
        schema_count=structured_summary['schema_count'],
        schema_completeness=structured_summary['schema_completeness'],
        has_organization=structured_summary['has_organization'],
        has_faq=structured_summary['has_faq'],
        same_as_count=structured_summary['same_as_count'],
        same_as_urls=structured_summary['same_as_urls'],
        robots_txt_found=crawler_summary['robots_txt_found'],
        sitemap_found=result.sitemap_found,
        ai_crawlers_allowed=crawler_summary['ai_crawlers_allowed'],
        ai_crawlers_blocked=crawler_summary['ai_crawlers_blocked'],
        has_about_page=authority_summary['has_about_page'],
        has_contact_info=authority_summary['has_contact_info'],
        social_links=authority_summary['social_links'],
        response_time_ms=result.html_response_time_ms,  # HTML-only response time
        js_rendered=result.js_rendered,  # Whether Playwright was used for SPA rendering
    )
    
    # Build response
    response = HealthCheckResponse(
        url=result.final_url,
        score=overall_score,
        grade=grade,
        visibility_band=visibility_band,
        band_color=band_color,
        tier_info=tier_info,
        categoryClarityScore=category_clarity,
        entityStrengthScore=entity_strength,
        authoritySignalScore=authority_signal,
        total_checks=len(all_issues),
        passed=severity_counts['passed'],
        errors=severity_counts['errors'],
        warnings=severity_counts['warnings'],
        notices=severity_counts['notices'],
        issues=[Issue(**issue) for issue in all_issues],
        summary=summary,
    )
    
    js_info = " (JS rendered)" if result.js_rendered else ""
    logger.info(f"Health check complete for {url}: score={overall_score}, grade={grade}{js_info}")
    
    return response

