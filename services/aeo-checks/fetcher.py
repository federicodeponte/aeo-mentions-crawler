"""Async fetcher for HTML content and robots.txt

Fetches both the main page HTML and robots.txt in parallel for comprehensive analysis.
Includes Cloudflare detection and Playwright-based JS rendering for SPAs.

v2.5: Added Cloudflare detection + JS rendering fallback
"""

import asyncio
import httpx
import logging
from typing import Optional, Tuple
from urllib.parse import urlparse, urljoin
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class FetchResult:
    """Result of fetching a website's content."""
    html: Optional[str]
    final_url: str
    robots_txt: Optional[str]
    sitemap_found: bool
    html_response_time_ms: int  # HTML-only response time for scoring
    total_fetch_time_ms: int    # Total parallel fetch time for diagnostics
    status_code: int
    js_rendered: bool = False   # Whether JS rendering was used
    error: Optional[str] = None


# Common browser headers to avoid bot blocking
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AEO-HealthCheck/2.5; +https://scaile.tech)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}

# Cloudflare challenge page patterns
CLOUDFLARE_PATTERNS = [
    "Checking your browser",
    "cf-browser-verification",
    "Just a moment...",
    "_cf_chl_opt",
    "Attention Required! | Cloudflare",
    "Please Wait... | Cloudflare",
    "Enable JavaScript and cookies to continue",
    "cf-spinner",
    "challenge-platform",
    "checking your connection",  # New Cloudflare interstitial
    "Verifying you are human",  # Cloudflare turnstile
    "We're currently checking",  # Cloudflare connection check
]


def is_cloudflare_challenge(html: str) -> bool:
    """Detect if HTML is a Cloudflare challenge page.
    
    Checks for Cloudflare-specific patterns that indicate a challenge/interstitial page.
    Note: Some sites embed challenges in larger HTML, so we check patterns regardless of size.
    """
    if not html:
        return False
    
    # Check first 100KB for challenge patterns (optimization for large pages)
    html_to_check = html[:100000]
    
    # Count how many patterns match - require at least 2 for confidence
    matches = sum(1 for pattern in CLOUDFLARE_PATTERNS if pattern in html_to_check)
    
    if matches >= 2:
        logger.info(f"Cloudflare challenge detected ({matches} patterns matched)")
        return True
    
    return False


def needs_js_rendering(html: str) -> bool:
    """Check if the page likely needs JavaScript rendering.
    
    Returns True if:
    - Word count is very low (< 100 words)
    - Contains common SPA framework markers
    - Has mostly empty body with JS app root
    """
    if not html:
        return True
    
    # Check for SPA framework markers
    spa_markers = [
        'id="root"',
        'id="app"',
        'id="__next"',
        'id="__nuxt"',
        '<noscript>',
        'react-root',
        'ng-app',
        'data-reactroot',
    ]
    
    has_spa_marker = any(marker in html for marker in spa_markers)
    
    # Quick word count check - remove script/style tags first, then strip HTML
    import re
    # Remove script and style content (including the tags)
    text = re.sub(r'<script[^>]*>[\s\S]*?</script>', ' ', html, flags=re.IGNORECASE)
    text = re.sub(r'<style[^>]*>[\s\S]*?</style>', ' ', text, flags=re.IGNORECASE)
    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    word_count = len(text.split()) if text else 0
    
    logger.info(f"needs_js_rendering check: word_count={word_count}, has_spa_marker={has_spa_marker}")
    
    # If very few words and has SPA markers, needs JS
    if word_count < 100 and has_spa_marker:
        logger.info(f"Triggering JS rendering: low words ({word_count}) + SPA marker")
        return True
    
    # If extremely few words, probably needs JS
    if word_count < 50:
        logger.info(f"Triggering JS rendering: very low word count ({word_count})")
        return True
    
    return False


async def fetch_with_playwright(url: str, timeout: float = 30.0) -> Tuple[Optional[str], int, str, int]:
    """Fetch URL using Playwright for JavaScript rendering.
    
    Returns: (html, status_code, final_url, response_time_ms)
    """
    import time
    start = time.time()
    
    try:
        from playwright.async_api import async_playwright
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage']
            )
            
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            page = await context.new_page()
            
            # Navigate and wait for network to be idle
            response = await page.goto(
                url, 
                wait_until="networkidle",
                timeout=int(timeout * 1000)
            )
            
            # Get final URL after redirects
            final_url = page.url
            status_code = response.status if response else 200
            
            # Get rendered HTML
            html = await page.content()
            
            await browser.close()
            
            elapsed_ms = int((time.time() - start) * 1000)
            logger.info(f"Playwright fetch completed for {url} in {elapsed_ms}ms")
            
            return (html, status_code, final_url, elapsed_ms)
            
    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        logger.error(f"Playwright fetch failed for {url}: {e}")
        return (None, 0, url, elapsed_ms)


async def fetch_url(client: httpx.AsyncClient, url: str) -> Tuple[Optional[str], int, str, int]:
    """Fetch a single URL and return (content, status_code, final_url, response_time_ms)."""
    import time
    start = time.time()
    try:
        response = await client.get(url, headers=HEADERS, follow_redirects=True)
        elapsed_ms = int((time.time() - start) * 1000)
        return (response.text, response.status_code, str(response.url), elapsed_ms)
    except httpx.TimeoutException:
        elapsed_ms = int((time.time() - start) * 1000)
        return (None, 0, url, elapsed_ms)
    except httpx.RequestError as e:
        elapsed_ms = int((time.time() - start) * 1000)
        return (None, 0, url, elapsed_ms)
    except Exception:
        elapsed_ms = int((time.time() - start) * 1000)
        return (None, 0, url, elapsed_ms)


async def fetch_robots_txt(client: httpx.AsyncClient, base_url: str) -> Optional[str]:
    """Fetch robots.txt from the website root."""
    parsed = urlparse(base_url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    
    try:
        response = await client.get(robots_url, headers=HEADERS, follow_redirects=True)
        if response.status_code == 200:
            return response.text
        return None
    except Exception:
        return None


async def fetch_sitemap(client: httpx.AsyncClient, base_url: str) -> bool:
    """Check if sitemap.xml exists at the website root.
    
    Returns:
        True if sitemap.xml exists and returns valid XML, False otherwise
    """
    parsed = urlparse(base_url)
    sitemap_url = f"{parsed.scheme}://{parsed.netloc}/sitemap.xml"
    
    try:
        response = await client.get(sitemap_url, headers=HEADERS, follow_redirects=True)
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '').lower()
            # Valid sitemap should be XML or contain XML content
            if 'xml' in content_type or response.text.strip().startswith('<?xml'):
                return True
        return False
    except Exception:
        return False


async def fetch_website(url: str, timeout: float = 30.0, enable_js_rendering: bool = True) -> FetchResult:
    """Fetch website HTML and robots.txt with hybrid JS rendering fallback.
    
    Strategy:
    1. Try static fetch first (fast, works for most sites)
    2. If Cloudflare challenge detected, return error (can't bypass)
    3. If page needs JS rendering (SPA), retry with Playwright
    
    Args:
        url: Website URL to analyze
        timeout: Request timeout in seconds
        enable_js_rendering: Whether to allow JS rendering fallback
        
    Returns:
        FetchResult with HTML content, robots.txt, and metadata
    """
    import time
    start_time = time.time()
    js_rendered = False
    
    # Normalize URL
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'
    
    # Phase 1: Static fetch for HTML, robots.txt, and sitemap in parallel
    async with httpx.AsyncClient(timeout=timeout) as client:
        html_task = fetch_url(client, url)
        robots_task = fetch_robots_txt(client, url)
        sitemap_task = fetch_sitemap(client, url)
        
        (html, status_code, final_url, html_response_time_ms), robots_txt, sitemap_found = await asyncio.gather(
            html_task, robots_task, sitemap_task
        )
    
    # Phase 2: Check if we need JS rendering (Cloudflare challenge OR SPA)
    cloudflare_detected = html and is_cloudflare_challenge(html)
    spa_detected = html and needs_js_rendering(html)
    
    if enable_js_rendering and (cloudflare_detected or spa_detected):
        reason = "Cloudflare challenge" if cloudflare_detected else "SPA"
        logger.info(f"{reason} detected for {url}, attempting Playwright rendering")
        
        # Try Playwright
        js_html, js_status, js_final_url, js_time_ms = await fetch_with_playwright(url, timeout=timeout)
        
        if js_html and not is_cloudflare_challenge(js_html):
            # Playwright succeeded and bypassed any challenges
            html = js_html
            status_code = js_status
            final_url = js_final_url
            html_response_time_ms = js_time_ms
            js_rendered = True
            logger.info(f"Playwright rendering succeeded for {url}")
        elif cloudflare_detected:
            # Playwright also failed and original was Cloudflare - give up
            total_fetch_time_ms = int((time.time() - start_time) * 1000)
            logger.warning(f"Cloudflare challenge could not be bypassed for {url}")
            return FetchResult(
                html=None,
                final_url=final_url,
                robots_txt=robots_txt,
                sitemap_found=sitemap_found,
                html_response_time_ms=html_response_time_ms,
                total_fetch_time_ms=total_fetch_time_ms,
                status_code=403,
                js_rendered=False,
                error="Site protected by Cloudflare challenge - unable to analyze (Playwright also blocked)"
            )
        else:
            # SPA but Playwright failed - use static HTML
            logger.warning(f"Playwright rendering failed for {url}, using static HTML")
    
    total_fetch_time_ms = int((time.time() - start_time) * 1000)
    
    if html is None:
        return FetchResult(
            html=None,
            final_url=final_url,
            robots_txt=robots_txt,
            sitemap_found=sitemap_found,
            html_response_time_ms=html_response_time_ms,
            total_fetch_time_ms=total_fetch_time_ms,
            status_code=status_code,
            js_rendered=js_rendered,
            error=f"Failed to fetch {url}"
        )
    
    return FetchResult(
        html=html,
        final_url=final_url,
        robots_txt=robots_txt,
        sitemap_found=sitemap_found,
        html_response_time_ms=html_response_time_ms,
        total_fetch_time_ms=total_fetch_time_ms,
        status_code=status_code,
        js_rendered=js_rendered
    )

