"""Logo Detector Module - Detects company logos from websites using GPT-4o-mini vision.

Based on crawl4logo (https://github.com/federicodeponte/crawl4logo)
Integrated into company-analysis service.
"""

import os
import io
import re
import hashlib
import logging
import base64
from typing import Optional, List
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from PIL import Image
from pydantic import BaseModel, Field

# Try to import cairosvg for SVG conversion
try:
    import cairosvg
    CAIROSVG_AVAILABLE = True
except ImportError:
    CAIROSVG_AVAILABLE = False

logger = logging.getLogger(__name__)

# Browser-like headers to avoid 403 blocks from sites like OpenAI, Perplexity
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
}


def get_openai_api_key():
    return os.getenv("OPENAI_API_KEY")


# ==================== Models ====================

class LogoCrawlRequest(BaseModel):
    website_url: str
    max_images: int = Field(default=20, description="Maximum images to analyze")
    confidence_threshold: float = Field(default=0.7, description="Minimum confidence score")


class LogoResult(BaseModel):
    url: str
    confidence: float
    description: str
    page_url: str
    image_hash: str
    is_header: bool = False
    rank_score: float = 0.0


class LogoCrawlResponse(BaseModel):
    logos: List[LogoResult]
    best_logo: Optional[LogoResult] = None
    website_url: str
    images_analyzed: int


# ==================== Logo Analysis ====================

# Keywords that indicate non-company logos
NON_COMPANY_KEYWORDS = [
    "facebook", "twitter", "x.com", "instagram", "linkedin", "youtube", "tiktok",
    "social media", "share", "like", "follow", "icon", "button", "arrow", "menu",
    "hamburger", "search", "magnifying glass", "close", "x mark", "play", "pause",
    "stop", "volume", "mute", "settings", "gear", "user", "profile", "account",
    "login", "logout", "sign in", "sign up", "cart", "shopping", "bag", "heart",
    "favorite", "star", "rating", "tag", "price", "discount", "sale",
]


def get_image_hash(image_data: bytes) -> str:
    """Generate MD5 hash for image caching."""
    return hashlib.md5(image_data).hexdigest()


def is_company_logo(description: str, url: str) -> bool:
    """Check if the detected logo is likely a company logo (not social media icons)."""
    if not description:
        return True
    
    description_lower = description.lower()
    url_lower = url.lower()
    
    for keyword in NON_COMPANY_KEYWORDS:
        if keyword in description_lower or keyword in url_lower:
            return False
    
    social_domains = ["facebook.com", "twitter.com", "x.com", "instagram.com", 
                      "linkedin.com", "youtube.com", "tiktok.com"]
    for domain in social_domains:
        if domain in url_lower:
            return False
    
    return True


def extract_confidence_score(content: str) -> float:
    """Extract confidence score from GPT-4o-mini response."""
    patterns = [
        r"confidence score:\s*(\d*\.?\d+)",
        r"confidence:\s*(\d*\.?\d+)",
        r"^(\d*\.?\d+),\s*",
        r"^(\d*\.?\d+)\s*-\s*",
        r"^(\d*\.?\d+)$",
    ]
    
    # Try dedicated lines first
    lines = content.split("\n")
    for line in lines:
        line_lower = line.lower().strip()
        if line_lower.startswith(("confidence:", "confidence score:")):
            match = re.search(r"(\d*\.?\d+)", line)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
    
    # Try patterns on entire content
    content_lower = content.lower()
    for pattern in patterns:
        match = re.search(pattern, content_lower)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                continue
    
    return 0.0


def extract_description(content: str) -> str:
    """Extract description from GPT-4o-mini response."""
    if "description:" in content.lower():
        parts = re.split(r"description:\s*", content, flags=re.IGNORECASE)
        if len(parts) > 1:
            return parts[1].strip()
    
    # Filter out confidence lines
    lines = content.split("\n")
    filtered = [l for l in lines if not l.lower().strip().startswith(("confidence:", "confidence score:"))]
    return " ".join(filtered).strip()


async def analyze_image_with_openai(
    client: httpx.AsyncClient,
    image_base64: str,
    image_url: str,
    page_url: str,
) -> Optional[LogoResult]:
    """Analyze image using GPT-4o-mini vision API."""
    api_key = get_openai_api_key()
    if not api_key:
        logger.error("OpenAI API key not configured")
        return None
    
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a logo detection assistant. Analyze the image and determine "
                    "if it's a company/brand logo. If it is, provide a confidence score (0-1) "
                    "and description in this format: 'Confidence Score: X.XX\\nDescription: ...'. "
                    "If not a logo (icons, buttons, social media icons, photos, etc.), return 'null'."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Is this image a company/brand logo? If yes, provide a confidence score "
                            "(0-1) and a brief description. Format: 'Confidence Score: X.XX\\n"
                            "Description: ...'. If no, return null."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_base64}"},
                    },
                ],
            },
        ],
        "max_tokens": 300,
    }
    
    try:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        if response.status_code != 200:
            logger.error(f"OpenAI API error: {response.status_code} - {response.text[:200]}")
            return None
        
        result = response.json()
    except Exception as e:
        logger.error(f"Error calling OpenAI: {e}")
        return None
    
    # Parse response
    try:
        content = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return None
    
    if content.lower().strip() == "null":
        return None
    
    confidence = extract_confidence_score(content)
    description = extract_description(content)
    image_hash = hashlib.md5(image_base64.encode()).hexdigest()
    
    return LogoResult(
        url=image_url,
        confidence=confidence,
        description=description,
        page_url=page_url,
        image_hash=image_hash,
        rank_score=confidence,
    )


async def fetch_and_process_image(
    client: httpx.AsyncClient,
    image_url: str,
    page_url: str,
    min_size: int = 32,
) -> Optional[tuple]:
    """Fetch image and convert to base64 PNG."""
    try:
        response = await client.get(image_url, timeout=15.0, headers=BROWSER_HEADERS)
        if response.status_code != 200:
            return None
        
        image_data = response.content
        image_hash = get_image_hash(image_data)
        
        # Handle SVG
        if image_url.lower().endswith(".svg"):
            if not CAIROSVG_AVAILABLE:
                logger.warning("cairosvg not available, skipping SVG")
                return None
            try:
                png_data = cairosvg.svg2png(bytestring=image_data)
                image = Image.open(io.BytesIO(png_data))
            except Exception as e:
                logger.error(f"SVG conversion failed: {e}")
                return None
        else:
            try:
                image = Image.open(io.BytesIO(image_data))
            except Exception:
                return None
        
        # Check minimum size
        width, height = image.size
        if width < min_size or height < min_size:
            return None
        
        # Convert to PNG base64
        buffered = io.BytesIO()
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            image.save(buffered, format="PNG")
        else:
            image = image.convert("RGB")
            image.save(buffered, format="PNG")
        
        image_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return image_base64, image_hash
        
    except Exception as e:
        logger.debug(f"Error fetching image {image_url}: {e}")
        return None


def extract_header_images(soup: BeautifulSoup, base_url: str) -> set:
    """Extract image URLs from header/navigation elements."""
    header_selectors = [
        "header", "nav", '[role="banner"]', ".header", ".nav",
        "#header", "#nav", ".navbar", ".site-header", ".main-header",
    ]
    
    header_images = set()
    for selector in header_selectors:
        try:
            elements = soup.select(selector)
            for element in elements:
                for img in element.find_all("img"):
                    src = img.get("src")
                    if src:
                        header_images.add(urljoin(base_url, src))
                
                for svg in element.find_all("svg"):
                    for image in svg.find_all("image"):
                        href = image.get("href") or image.get("xlink:href")
                        if href:
                            header_images.add(urljoin(base_url, href))
        except Exception:
            continue
    
    return header_images


def extract_all_images(soup: BeautifulSoup, base_url: str) -> set:
    """Extract all image URLs from page."""
    images = set()
    
    # <img> tags
    for img in soup.find_all("img"):
        src = img.get("src")
        if src and not src.startswith("data:"):
            images.add(urljoin(base_url, src))
    
    # SVG <image> elements
    for svg in soup.find_all("svg"):
        for image in svg.find_all("image"):
            href = image.get("href") or image.get("xlink:href")
            if href and not href.startswith("data:"):
                images.add(urljoin(base_url, href))
    
    # Background images in inline styles
    for element in soup.find_all(style=True):
        style = element.get("style", "")
        matches = re.findall(r"background-image:\s*url\(['\"]?([^'\")\s]+)['\"]?\)", style)
        for match in matches:
            if not match.startswith("data:"):
                images.add(urljoin(base_url, match))
    
    return images


def extract_meta_images(soup: BeautifulSoup, base_url: str) -> dict:
    """Extract logo-like images from meta tags (favicon, og:image, etc.)."""
    meta_images = {
        "favicon": [],
        "og_image": [],
        "twitter_image": [],
    }
    
    # Favicon and icon links
    for link in soup.find_all("link", rel=True):
        rel = " ".join(link.get("rel", []))
        href = link.get("href")
        if href and any(x in rel.lower() for x in ["icon", "apple-touch-icon"]):
            meta_images["favicon"].append(urljoin(base_url, href))
    
    # og:image meta tag
    for meta in soup.find_all("meta", property="og:image"):
        content = meta.get("content")
        if content:
            meta_images["og_image"].append(urljoin(base_url, content))
    
    # twitter:image meta tag
    for meta in soup.find_all("meta", attrs={"name": "twitter:image"}):
        content = meta.get("content")
        if content:
            meta_images["twitter_image"].append(urljoin(base_url, content))
    
    return meta_images


# ==================== Helper Functions ====================

def extract_meta_refresh_url(html: str, base_url: str) -> Optional[str]:
    """Extract redirect URL from meta http-equiv="refresh" tag.

    Handles patterns like:
    - <meta http-equiv="refresh" content="0; URL=/de-de/">
    - <meta content="0;url=https://example.com" http-equiv="refresh">
    """
    soup = BeautifulSoup(html, "html.parser")
    meta_refresh = soup.find("meta", attrs={"http-equiv": re.compile(r"refresh", re.I)})

    if meta_refresh:
        content = meta_refresh.get("content", "")
        # Parse the content - format is typically "delay; url=redirect_url"
        match = re.search(r"url\s*=\s*([^\s;\"']+)", content, re.IGNORECASE)
        if match:
            redirect_url = match.group(1).strip("'\"")
            # Handle relative URLs
            if redirect_url.startswith("/"):
                return urljoin(base_url, redirect_url)
            elif not redirect_url.startswith(("http://", "https://")):
                return urljoin(base_url, redirect_url)
            return redirect_url
    return None


# ==================== Clearbit Logo API ====================

async def try_clearbit_logo(domain: str, website_url: str) -> Optional["LogoCrawlResponse"]:
    """Try to get logo from Clearbit API (free, fast, high quality).
    
    Clearbit provides curated company logos for most established companies.
    Returns None if Clearbit doesn't have the logo (404) or on any error.
    """
    clearbit_url = f"https://logo.clearbit.com/{domain}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.head(clearbit_url)
            if resp.status_code == 200:
                logo = LogoResult(
                    url=clearbit_url,
                    confidence=0.95,
                    description="Logo from Clearbit API",
                    page_url=website_url,
                    image_hash=hashlib.md5(clearbit_url.encode()).hexdigest(),
                    is_header=True,
                    rank_score=2.0,
                )
                logger.info(f"Clearbit logo found for {domain}: {clearbit_url}")
                return LogoCrawlResponse(
                    logos=[logo],
                    best_logo=logo,
                    website_url=website_url,
                    images_analyzed=1,
                )
    except Exception as e:
        logger.debug(f"Clearbit check failed for {domain}: {e}")
    return None


# ==================== Main Function ====================

async def crawl_for_logos(
    website_url: str,
    max_images: int = 20,
    confidence_threshold: float = 0.7,
) -> LogoCrawlResponse:
    """Crawl a website and detect company logos.
    
    Args:
        website_url: URL of the website to crawl
        max_images: Maximum number of images to analyze
        confidence_threshold: Minimum confidence score for logo detection
        
    Returns:
        LogoCrawlResponse with detected logos and best logo
    """
    logger.info(f"Crawling {website_url} for logos...")
    
    # Normalize URL
    url = website_url
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    
    # Extract domain for Clearbit lookup
    domain = urlparse(url).netloc.replace("www.", "")
    
    # Try Clearbit first (free, fast, reliable for established companies)
    clearbit_result = await try_clearbit_logo(domain, url)
    if clearbit_result:
        logger.info(f"Using Clearbit logo for {domain}")
        return clearbit_result
    
    logger.info(f"Clearbit unavailable for {domain}, falling back to crawler...")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Fetch page
        try:
            response = await client.get(url, timeout=20.0, headers=BROWSER_HEADERS)
            if response.status_code != 200:
                logger.error(f"Failed to fetch website: {response.status_code}")
                return LogoCrawlResponse(
                    logos=[],
                    best_logo=None,
                    website_url=url,
                    images_analyzed=0,
                )
            html = response.text
            # Update URL to final redirected URL
            url = str(response.url)
            logger.info(f"Final URL after redirects: {url}")

            # Check for meta refresh redirect (not followed by httpx)
            # This handles sites like helpify.net that use <meta http-equiv="refresh">
            if len(html) < 500:  # Only check short pages that might be redirect stubs
                meta_refresh_url = extract_meta_refresh_url(html, url)
                if meta_refresh_url:
                    logger.info(f"Found meta refresh redirect to: {meta_refresh_url}")
                    # Follow the meta refresh redirect
                    response = await client.get(meta_refresh_url, timeout=20.0, headers=BROWSER_HEADERS)
                    if response.status_code == 200:
                        html = response.text
                        url = str(response.url)
                        logger.info(f"Followed meta refresh to: {url}")
        except httpx.RequestError as e:
            logger.error(f"Failed to fetch website: {e}")
            return LogoCrawlResponse(
                logos=[],
                best_logo=None,
                website_url=url,
                images_analyzed=0,
            )
        
        # Parse HTML
        soup = BeautifulSoup(html, "html.parser")
        logger.info(f"HTML length: {len(html)}")
        
        # Extract meta images (favicon, og:image, etc.)
        meta_images = extract_meta_images(soup, url)
        logger.info(f"Found meta images: {len(meta_images['favicon'])} favicons, {len(meta_images['og_image'])} og:images")
        
        # Get images
        header_images = extract_header_images(soup, url)
        all_images = extract_all_images(soup, url)
        logger.info(f"Found {len(all_images)} total images before filtering")
        
        # Filter to valid image extensions (more permissive for CDN URLs)
        valid_extensions = (".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico")
        # Also include images from known image CDNs even without extensions
        image_cdns = ("framerusercontent.com", "cloudinary.com", "imgix.net", "cloudfront.net", "unsplash.com")
        all_images = {
            img for img in all_images 
            if any(img.lower().endswith(ext) for ext in valid_extensions) 
            or "/logo" in img.lower()
            or any(cdn in img.lower() for cdn in image_cdns)
        }
        logger.info(f"After filtering: {len(all_images)} images")
        
        # Prioritize header images and images with "logo" in URL
        prioritized = []
        for img in all_images:
            if img in header_images or "logo" in img.lower():
                prioritized.insert(0, img)
            else:
                prioritized.append(img)
        
        # Limit to max_images
        images_to_analyze = prioritized[:max_images]
        
        logger.info(f"Found {len(all_images)} images, analyzing {len(images_to_analyze)}...")
        
        # Analyze images
        results = []
        processed_hashes = set()
        
        # Add favicon as HIGH-PRIORITY logo (this is always the actual logo icon)
        for favicon_url in meta_images["favicon"][:2]:  # Check first 2 favicons (often apple-touch-icon is better)
            try:
                processed = await fetch_and_process_image(client, favicon_url, url, min_size=16)
                if processed:
                    image_base64, image_hash = processed
                    if image_hash not in processed_hashes:
                        processed_hashes.add(image_hash)
                        # apple-touch-icon is higher quality than favicon.ico
                        is_apple_touch = "apple-touch" in favicon_url.lower()
                        results.append(LogoResult(
                            url=favicon_url,
                            confidence=0.92 if is_apple_touch else 0.88,
                            description="Apple Touch Icon (high-res logo)" if is_apple_touch else "Favicon/icon from HTML meta tags",
                            page_url=url,
                            image_hash=image_hash,
                            is_header=True,
                            rank_score=1.8 if is_apple_touch else 1.5,  # Highest priority - favicons are actual logos
                        ))
                        logger.info(f"Added favicon as logo: {favicon_url} (apple-touch: {is_apple_touch})")
            except Exception as e:
                logger.debug(f"Error processing favicon {favicon_url}: {e}")
        
        # og:image is LOW priority - it's usually a social sharing BANNER, not the logo
        # Only add it as fallback if we don't find better options
        og_image_fallback = None
        for og_url in meta_images["og_image"][:1]:
            logger.info(f"Processing og:image (low priority fallback): {og_url}")
            try:
                processed = await fetch_and_process_image(client, og_url, url, min_size=32)
                if processed:
                    image_base64, image_hash = processed
                    if image_hash not in processed_hashes:
                        # Check aspect ratio - skip wide banners (social sharing images are typically 1200x630)
                        try:
                            img_data = base64.b64decode(image_base64)
                            img = Image.open(io.BytesIO(img_data))
                            width, height = img.size
                            aspect_ratio = width / height if height > 0 else 999
                            
                            if aspect_ratio > 1.8:
                                logger.info(f"Skipping og:image - too wide (aspect ratio: {aspect_ratio:.2f}), likely a social banner")
                                continue
                        except Exception as e:
                            logger.debug(f"Could not check og:image aspect ratio: {e}")
                        
                        processed_hashes.add(image_hash)
                        og_image_fallback = LogoResult(
                            url=og_url,
                            confidence=0.60,  # Low confidence - og:image is often NOT the logo
                            description="og:image meta tag (social sharing image - may not be actual logo)",
                            page_url=url,
                            image_hash=image_hash,
                            is_header=False,
                            rank_score=0.3,  # LOW priority - only use as last resort
                        )
                        logger.info(f"Stored og:image as fallback: {og_url}")
            except Exception as e:
                logger.warning(f"Error processing og:image {og_url}: {type(e).__name__}: {e}")
        
        # Process regular images
        for image_url in images_to_analyze:
            try:
                # Fetch and process image
                processed = await fetch_and_process_image(client, image_url, url)
                if not processed:
                    continue
                
                image_base64, image_hash = processed
                
                # Skip duplicates
                if image_hash in processed_hashes:
                    continue
                processed_hashes.add(image_hash)
                
                # Analyze with OpenAI
                result = await analyze_image_with_openai(client, image_base64, image_url, url)
                if result and result.confidence >= confidence_threshold:
                    # Filter out non-company logos
                    if is_company_logo(result.description, image_url):
                        result.is_header = image_url in header_images
                        has_logo_in_url = "logo" in image_url.lower()
                        
                        # Calculate rank score with boosts
                        rank_multiplier = 1.0
                        if result.is_header:
                            rank_multiplier *= 1.3  # Header images are likely logos
                        if has_logo_in_url:
                            rank_multiplier *= 1.4  # "logo" in URL is strong signal
                        
                        result.rank_score = result.confidence * rank_multiplier
                        results.append(result)
                        logger.info(f"Found logo: {image_url} (confidence: {result.confidence:.2f}, rank: {result.rank_score:.2f}, header: {result.is_header}, logo_url: {has_logo_in_url})")
            
            except Exception as e:
                logger.debug(f"Error processing {image_url}: {e}")
                continue
        
        # Sort by rank score
        results.sort(key=lambda x: x.rank_score, reverse=True)
        
        # Add og:image fallback only if we have no good results
        if og_image_fallback and (not results or results[0].rank_score < 0.5):
            results.append(og_image_fallback)
            logger.info("Added og:image as fallback since no better logos found")
        
        # Determine best logo
        best_logo = results[0] if results else None
        
        logger.info(f"Found {len(results)} logos, best: {best_logo.url if best_logo else 'None'}")
        
        return LogoCrawlResponse(
            logos=results,
            best_logo=best_logo,
            website_url=url,
            images_analyzed=len(images_to_analyze),
        )


