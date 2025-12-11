"""Website Technology Detection Module

Deterministic detection of CMS, tech stack, social links, and metadata from HTML.
"""

import re
import json
from typing import Optional, Dict, List, Tuple, Any
from urllib.parse import urljoin, urlparse


# ==================== CMS Detection ====================

CMS_SIGNATURES = {
    "wordpress": [
        (r'wp-content/', "wp-content directory"),
        (r'wp-includes/', "wp-includes directory"),
        (r'<meta name="generator" content="WordPress', "generator meta tag"),
        (r'wp-json', "wp-json API"),
    ],
    "webflow": [
        (r'webflow\.com', "webflow.com reference"),
        (r'class="w-', "Webflow w- CSS classes"),
        (r'data-wf-', "Webflow data attributes"),
    ],
    "framer": [
        (r'framer\.com', "framer.com reference"),
        (r'framerusercontent\.com', "Framer CDN"),
        (r'Framer/', "Framer server header"),
    ],
    "shopify": [
        (r'cdn\.shopify\.com', "Shopify CDN"),
        (r'Shopify\.theme', "Shopify theme object"),
        (r'myshopify\.com', "Shopify domain"),
    ],
    "squarespace": [
        (r'squarespace\.com', "Squarespace reference"),
        (r'class="sqs-', "Squarespace CSS classes"),
        (r'static\.squarespace\.com', "Squarespace static CDN"),
    ],
    "wix": [
        (r'wix\.com', "Wix reference"),
        (r'wixsite\.com', "Wix site domain"),
        (r'static\.wixstatic\.com', "Wix static CDN"),
    ],
    "hubspot": [
        (r'hs-scripts\.com', "HubSpot scripts"),
        (r'hubspot\.com', "HubSpot reference"),
        (r'<meta name="generator" content="HubSpot', "HubSpot generator"),
    ],
    "ghost": [
        (r'ghost\.io', "Ghost.io reference"),
        (r'<meta name="generator" content="Ghost', "Ghost generator"),
        (r'ghost-', "Ghost CSS prefix"),
    ],
    "drupal": [
        (r'Drupal\.settings', "Drupal settings"),
        (r'/sites/default/files', "Drupal files path"),
        (r'<meta name="generator" content="Drupal', "Drupal generator"),
    ],
    "joomla": [
        (r'/media/jui/', "Joomla media path"),
        (r'<meta name="generator" content="Joomla', "Joomla generator"),
    ],
    "contentful": [
        (r'contentful\.com', "Contentful reference"),
        (r'ctfassets\.net', "Contentful assets CDN"),
    ],
    "sanity": [
        (r'sanity\.io', "Sanity reference"),
        (r'cdn\.sanity\.io', "Sanity CDN"),
    ],
    "strapi": [
        (r'strapi', "Strapi reference"),
    ],
    "notion": [
        (r'notion\.so', "Notion reference"),
        (r'notion-static', "Notion static assets"),
    ],
}


def detect_cms(html: str, url: str = "") -> Tuple[Optional[str], Optional[str]]:
    """
    Detect CMS/platform from HTML content.
    
    Returns:
        Tuple of (cms_name, detection_method) or (None, None) if not detected
    """
    html_lower = html.lower()
    
    for cms, signatures in CMS_SIGNATURES.items():
        for pattern, description in signatures:
            if re.search(pattern, html, re.IGNORECASE):
                return (cms, f"detected via {description}")
    
    return (None, None)


# ==================== Tech Stack Detection ====================

FRAMEWORK_SIGNATURES = {
    "react": [
        (r'__REACT', "React internal"),
        (r'data-reactroot', "React root"),
        (r'_reactListening', "React event listener"),
    ],
    "next.js": [
        (r'__NEXT_DATA__', "Next.js data"),
        (r'/_next/', "Next.js assets"),
        (r'__next', "Next.js container"),
    ],
    "vue": [
        (r'__VUE__', "Vue internal"),
        (r'data-v-[a-f0-9]', "Vue scoped styles"),
        (r'v-cloak', "Vue cloak directive"),
    ],
    "nuxt": [
        (r'__NUXT__', "Nuxt data"),
        (r'/_nuxt/', "Nuxt assets"),
    ],
    "angular": [
        (r'ng-version', "Angular version"),
        (r'ng-app', "Angular app"),
        (r'_nghost', "Angular host"),
    ],
    "svelte": [
        (r'svelte', "Svelte reference"),
        (r'__svelte', "Svelte internal"),
    ],
    "gatsby": [
        (r'___gatsby', "Gatsby container"),
        (r'/static/', "Gatsby static"),
    ],
    "remix": [
        (r'__remixContext', "Remix context"),
    ],
    "astro": [
        (r'astro-', "Astro prefix"),
    ],
}

ANALYTICS_SIGNATURES = {
    "google-analytics": [
        (r'google-analytics\.com', "GA script"),
        (r'googletagmanager\.com', "GTM"),
        (r'gtag\(', "gtag function"),
        (r'ga\(\'create\'', "GA classic"),
    ],
    "segment": [
        (r'segment\.com', "Segment"),
        (r'analytics\.js', "Analytics.js"),
        (r'cdn\.segment\.io', "Segment CDN"),
    ],
    "mixpanel": [
        (r'mixpanel\.com', "Mixpanel"),
        (r'mixpanel\.init', "Mixpanel init"),
    ],
    "amplitude": [
        (r'amplitude\.com', "Amplitude"),
        (r'cdn\.amplitude\.com', "Amplitude CDN"),
    ],
    "hotjar": [
        (r'hotjar\.com', "Hotjar"),
        (r'static\.hotjar\.com', "Hotjar static"),
    ],
    "heap": [
        (r'heap\.io', "Heap"),
        (r'heapanalytics\.com', "Heap Analytics"),
    ],
    "plausible": [
        (r'plausible\.io', "Plausible"),
    ],
    "fathom": [
        (r'usefathom\.com', "Fathom"),
    ],
    "posthog": [
        (r'posthog\.com', "PostHog"),
        (r'app\.posthog\.com', "PostHog app"),
    ],
}

MARKETING_SIGNATURES = {
    "hubspot": [
        (r'hs-scripts\.com', "HubSpot scripts"),
        (r'js\.hs-scripts\.com', "HubSpot JS"),
        (r'hbspt\.', "HubSpot object"),
    ],
    "intercom": [
        (r'intercom', "Intercom"),
        (r'widget\.intercom\.io', "Intercom widget"),
    ],
    "drift": [
        (r'drift\.com', "Drift"),
        (r'js\.driftt\.com', "Drift JS"),
    ],
    "crisp": [
        (r'crisp\.chat', "Crisp"),
    ],
    "zendesk": [
        (r'zendesk\.com', "Zendesk"),
        (r'zdassets\.com', "Zendesk assets"),
    ],
    "mailchimp": [
        (r'mailchimp\.com', "Mailchimp"),
        (r'chimpstatic\.com', "Mailchimp static"),
    ],
    "klaviyo": [
        (r'klaviyo\.com', "Klaviyo"),
    ],
    "activecampaign": [
        (r'activecampaign\.com', "ActiveCampaign"),
    ],
    "marketo": [
        (r'marketo\.com', "Marketo"),
        (r'mktoresp\.com', "Marketo response"),
    ],
    "facebook-pixel": [
        (r'connect\.facebook\.net', "Facebook pixel"),
        (r'fbevents\.js', "FB events"),
    ],
    "linkedin-insight": [
        (r'snap\.licdn\.com', "LinkedIn Insight"),
    ],
    "twitter-pixel": [
        (r'static\.ads-twitter\.com', "Twitter pixel"),
    ],
}

PAYMENT_SIGNATURES = {
    "stripe": [
        (r'js\.stripe\.com', "Stripe JS"),
        (r'stripe\.com', "Stripe"),
    ],
    "paypal": [
        (r'paypal\.com', "PayPal"),
        (r'paypalobjects\.com', "PayPal objects"),
    ],
    "square": [
        (r'squareup\.com', "Square"),
    ],
    "braintree": [
        (r'braintreegateway\.com', "Braintree"),
    ],
    "adyen": [
        (r'adyen\.com', "Adyen"),
    ],
    "klarna": [
        (r'klarna\.com', "Klarna"),
    ],
    "afterpay": [
        (r'afterpay\.com', "Afterpay"),
    ],
}

COOKIE_CONSENT_SIGNATURES = {
    "onetrust": [
        (r'onetrust\.com', "OneTrust"),
        (r'cookielaw\.org', "OneTrust CookieLaw"),
    ],
    "cookiebot": [
        (r'cookiebot\.com', "Cookiebot"),
    ],
    "termly": [
        (r'termly\.io', "Termly"),
    ],
    "iubenda": [
        (r'iubenda\.com', "Iubenda"),
    ],
    "trustarc": [
        (r'trustarc\.com', "TrustArc"),
    ],
    "quantcast": [
        (r'quantcast\.com', "Quantcast"),
    ],
    "usercentrics": [
        (r'usercentrics\.eu', "Usercentrics"),
    ],
}


def detect_tech_stack(html: str) -> Dict[str, List[str]]:
    """
    Detect technology stack from HTML content.
    
    Returns:
        Dict with keys: frameworks, analytics, marketing, payments, cookie_consent
    """
    result = {
        "frameworks": [],
        "analytics": [],
        "marketing": [],
        "payments": [],
        "cookie_consent": None,
    }
    
    # Detect frameworks
    for tech, signatures in FRAMEWORK_SIGNATURES.items():
        for pattern, _ in signatures:
            if re.search(pattern, html, re.IGNORECASE):
                if tech not in result["frameworks"]:
                    result["frameworks"].append(tech)
                break
    
    # Detect analytics
    for tech, signatures in ANALYTICS_SIGNATURES.items():
        for pattern, _ in signatures:
            if re.search(pattern, html, re.IGNORECASE):
                if tech not in result["analytics"]:
                    result["analytics"].append(tech)
                break
    
    # Detect marketing tools
    for tech, signatures in MARKETING_SIGNATURES.items():
        for pattern, _ in signatures:
            if re.search(pattern, html, re.IGNORECASE):
                if tech not in result["marketing"]:
                    result["marketing"].append(tech)
                break
    
    # Detect payment providers
    for tech, signatures in PAYMENT_SIGNATURES.items():
        for pattern, _ in signatures:
            if re.search(pattern, html, re.IGNORECASE):
                if tech not in result["payments"]:
                    result["payments"].append(tech)
                break
    
    # Detect cookie consent
    for tech, signatures in COOKIE_CONSENT_SIGNATURES.items():
        for pattern, _ in signatures:
            if re.search(pattern, html, re.IGNORECASE):
                result["cookie_consent"] = tech
                break
        if result["cookie_consent"]:
            break
    
    return result


# ==================== Social Media Extraction ====================

SOCIAL_PATTERNS = {
    "linkedin": [
        r'https?://(?:www\.)?linkedin\.com/company/([^/"\s?]+)',
        r'https?://(?:www\.)?linkedin\.com/in/([^/"\s?]+)',
    ],
    "twitter": [
        r'https?://(?:www\.)?twitter\.com/([^/"\s?]+)',
        r'https?://(?:www\.)?x\.com/([^/"\s?]+)',
    ],
    "facebook": [
        r'https?://(?:www\.)?facebook\.com/([^/"\s?]+)',
    ],
    "instagram": [
        r'https?://(?:www\.)?instagram\.com/([^/"\s?]+)',
    ],
    "youtube": [
        r'https?://(?:www\.)?youtube\.com/(?:channel/|c/|@)([^/"\s?]+)',
        r'https?://(?:www\.)?youtube\.com/([^/"\s?]+)',
    ],
    "tiktok": [
        r'https?://(?:www\.)?tiktok\.com/@([^/"\s?]+)',
    ],
    "github": [
        r'https?://(?:www\.)?github\.com/([^/"\s?]+)',
    ],
    "discord": [
        r'https?://(?:www\.)?discord\.(?:gg|com/invite)/([^/"\s?]+)',
    ],
    "slack": [
        r'https?://([^.]+)\.slack\.com',
    ],
}

# Exclude common non-profile patterns
SOCIAL_EXCLUDES = {
    "linkedin": ["share", "shareArticle", "login", "signup", "help", "legal", "policy", "learning", "jobs"],
    "twitter": ["share", "intent", "home", "login", "i", "search", "explore", "settings", "help"],
    "facebook": ["share", "sharer", "login", "help", "legal", "policy", "dialog", "tr", "pixel", "plugins", "connect"],
    "instagram": ["p", "explore", "accounts", "help", "legal", "privacy"],
    "youtube": ["watch", "results", "feed", "playlist", "channel", "shorts", "live", "gaming", "music"],
    "github": ["login", "signup", "join", "explore", "features", "enterprise", "pricing", "topics"],
    "slack": ["join", "api", "apps", "help", "pricing", "features", "enterprise", "contact"],
    "discord": ["login", "register", "download", "nitro", "safety"],
}


def extract_social_links(html: str, base_url: str = "") -> Dict[str, str]:
    """
    Extract social media links from HTML.
    
    Returns:
        Dict mapping platform name to URL
    """
    social_links = {}
    
    for platform, patterns in SOCIAL_PATTERNS.items():
        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                # Skip excluded patterns
                if match.lower() in SOCIAL_EXCLUDES.get(platform, []):
                    continue
                # Skip if it looks like a generic path
                if match.lower() in ["", "/", "#"]:
                    continue
                
                # Construct full URL
                if platform == "twitter" and "x.com" in pattern:
                    url = f"https://x.com/{match}"
                elif platform == "twitter":
                    url = f"https://twitter.com/{match}"
                elif platform == "linkedin":
                    if "/company/" in pattern:
                        url = f"https://linkedin.com/company/{match}"
                    else:
                        url = f"https://linkedin.com/in/{match}"
                elif platform == "youtube":
                    if match.startswith("@") or "channel/" in pattern or "c/" in pattern:
                        url = f"https://youtube.com/@{match.lstrip('@')}"
                    else:
                        url = f"https://youtube.com/{match}"
                else:
                    url = f"https://{platform}.com/{match}"
                
                # Only take first match per platform
                if platform not in social_links:
                    social_links[platform] = url
                    break
        
    return social_links


# ==================== Schema.org / JSON-LD Extraction ====================

def extract_schema_data(html: str) -> Tuple[List[str], Optional[Dict[str, Any]]]:
    """
    Extract Schema.org JSON-LD structured data from HTML.
    
    Returns:
        Tuple of (list of schema types, combined schema data dict)
    """
    schema_types = []
    schema_data = None
    
    # Find all JSON-LD script tags
    jsonld_pattern = r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
    matches = re.findall(jsonld_pattern, html, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        try:
            data = json.loads(match.strip())
            
            # Handle @graph structure
            if isinstance(data, dict) and "@graph" in data:
                items = data["@graph"]
            elif isinstance(data, list):
                items = data
            else:
                items = [data]
            
            for item in items:
                if isinstance(item, dict):
                    schema_type = item.get("@type")
                    if schema_type:
                        if isinstance(schema_type, list):
                            schema_types.extend(schema_type)
                        else:
                            schema_types.append(schema_type)
                    
                    # Store first Organization or LocalBusiness data
                    if schema_data is None and schema_type in ["Organization", "LocalBusiness", "Corporation", "Company"]:
                        schema_data = item
        except (json.JSONDecodeError, TypeError):
            continue
    
    # Deduplicate schema types
    schema_types = list(dict.fromkeys(schema_types))
    
    return (schema_types, schema_data)


# ==================== Meta Tags Extraction ====================

def extract_meta_tags(html: str) -> Dict[str, Optional[str]]:
    """
    Extract SEO meta tags from HTML.
    
    Returns:
        Dict with meta_title, meta_description, canonical_url, sitemap_url
    """
    result = {
        "meta_title": None,
        "meta_description": None,
        "canonical_url": None,
        "sitemap_url": None,
    }
    
    # Title tag
    title_match = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
    if title_match:
        result["meta_title"] = title_match.group(1).strip()
    
    # Meta description
    desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not desc_match:
        desc_match = re.search(r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']description["\']', html, re.IGNORECASE)
    if desc_match:
        result["meta_description"] = desc_match.group(1).strip()
    
    # Canonical URL
    canonical_match = re.search(r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not canonical_match:
        canonical_match = re.search(r'<link[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\']', html, re.IGNORECASE)
    if canonical_match:
        result["canonical_url"] = canonical_match.group(1).strip()
    
    # Sitemap URL (check robots.txt reference or common patterns)
    sitemap_match = re.search(r'href=["\']([^"\']*sitemap[^"\']*\.xml)["\']', html, re.IGNORECASE)
    if sitemap_match:
        result["sitemap_url"] = sitemap_match.group(1).strip()
    
    return result


# ==================== Language Detection ====================

def detect_languages(html: str) -> Tuple[Optional[str], List[str]]:
    """
    Detect primary language and available languages from HTML.
    
    Returns:
        Tuple of (primary_language, list of available_languages)
    """
    primary_lang = None
    available_langs = []
    
    # Check <html lang="...">
    html_lang_match = re.search(r'<html[^>]*lang=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if html_lang_match:
        primary_lang = html_lang_match.group(1).split("-")[0].lower()  # "en-US" -> "en"
    
    # Check hreflang tags for available languages
    hreflang_matches = re.findall(r'hreflang=["\']([^"\']+)["\']', html, re.IGNORECASE)
    for lang in hreflang_matches:
        lang_code = lang.split("-")[0].lower()
        # Filter out x-default and single letter codes
        if lang_code not in ["x", "x-default"] and len(lang_code) >= 2 and lang_code not in available_langs:
            available_langs.append(lang_code)
    
    # Also check for language switcher patterns
    lang_link_matches = re.findall(r'/(?:lang|locale|language)[=/]([a-z]{2})', html, re.IGNORECASE)
    for lang in lang_link_matches:
        if lang.lower() not in available_langs:
            available_langs.append(lang.lower())
    
    return (primary_lang, available_langs)


# ==================== Blog/Content Detection ====================

def detect_blog(html: str, base_url: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Detect blog presence, URL, and RSS feed.
    
    Returns:
        Tuple of (has_blog, blog_url, rss_feed_url)
    """
    has_blog = False
    blog_url = None
    rss_feed = None
    
    # Check for common blog paths in links
    blog_patterns = [
        r'href=["\']([^"\']*(?:/blog|/articles|/news|/resources|/insights|/posts)[^"\']*)["\']',
    ]
    
    for pattern in blog_patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            has_blog = True
            blog_path = match.group(1)
            if blog_path.startswith("http"):
                blog_url = blog_path
            else:
                blog_url = urljoin(base_url, blog_path)
            break
    
    # Check for RSS feed
    rss_match = re.search(r'<link[^>]*type=["\']application/rss\+xml["\'][^>]*href=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not rss_match:
        rss_match = re.search(r'<link[^>]*href=["\']([^"\']+)["\'][^>]*type=["\']application/rss\+xml["\']', html, re.IGNORECASE)
    if not rss_match:
        rss_match = re.search(r'href=["\']([^"\']*(?:feed|rss)[^"\']*\.xml)["\']', html, re.IGNORECASE)
    
    if rss_match:
        has_blog = True
        rss_path = rss_match.group(1)
        if rss_path.startswith("http"):
            rss_feed = rss_path
        else:
            rss_feed = urljoin(base_url, rss_path)
    
    return (has_blog, blog_url, rss_feed)


# ==================== Contact Info Extraction ====================

def extract_contact_info(html: str) -> Tuple[List[str], List[str]]:
    """
    Extract email addresses and phone numbers from HTML.
    
    Returns:
        Tuple of (list of emails, list of phones)
    """
    emails = []
    phones = []
    
    # Email patterns (exclude common non-contact emails)
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    email_excludes = ["example.com", "email.com", "domain.com", "yourcompany.com", "sentry.io", "wix.com", "webflow.io"]
    
    email_matches = re.findall(email_pattern, html)
    for email in email_matches:
        email_lower = email.lower()
        if not any(exc in email_lower for exc in email_excludes):
            if email_lower not in [e.lower() for e in emails]:
                emails.append(email)
    
    # Phone patterns (international formats) - more strict to avoid CSS/numeric false positives
    phone_patterns = [
        r'\+[1-9]\d{0,2}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}',  # +1 (555) 123-4567, +49 89 123456
        r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}',  # (555) 123-4567
        r'(?<!\d)\d{3}[-.\s]\d{3}[-.\s]\d{4}(?!\d)',  # 555-123-4567 (with word boundaries)
    ]
    
    for pattern in phone_patterns:
        phone_matches = re.findall(pattern, html)
        for phone in phone_matches:
            # Clean up 
            clean_phone = re.sub(r'[^\d+]', '', phone)
            # Must be 10+ digits and not start with +0 (invalid country code)
            if len(clean_phone) >= 10 and not clean_phone.startswith('+0'):
                # Deduplicate
                if clean_phone not in [re.sub(r'[^\d+]', '', p) for p in phones]:
                    phones.append(phone.strip())
    
    # Limit results
    return (emails[:5], phones[:3])


# ==================== Main Detection Function ====================

def analyze_website_tech(html: str, url: str) -> Dict[str, Any]:
    """
    Perform comprehensive website technology analysis.
    
    Args:
        html: Raw HTML content
        url: Website URL (for resolving relative URLs)
    
    Returns:
        Dict containing all detected technology information
    """
    # CMS Detection
    cms, cms_confidence = detect_cms(html, url)
    
    # Tech Stack Detection
    tech_stack = detect_tech_stack(html)
    
    # Social Media Links
    social_links = extract_social_links(html, url)
    
    # Schema.org Data
    schema_types, schema_data = extract_schema_data(html)
    
    # Meta Tags
    meta_tags = extract_meta_tags(html)
    
    # Language Detection
    primary_lang, available_langs = detect_languages(html)
    
    # Blog Detection
    has_blog, blog_url, rss_feed = detect_blog(html, url)
    
    # Contact Info
    emails, phones = extract_contact_info(html)
    
    # Check SSL (from URL)
    has_ssl = url.startswith("https://")
    
    return {
        "cms": cms,
        "cms_confidence": cms_confidence,
        "frameworks": tech_stack["frameworks"],
        "analytics": tech_stack["analytics"],
        "marketing": tech_stack["marketing"],
        "payments": tech_stack["payments"],
        "social_links": social_links,
        "schema_types": schema_types,
        "schema_data": schema_data,
        "emails": emails,
        "phones": phones,
        "has_blog": has_blog,
        "blog_url": blog_url,
        "rss_feed": rss_feed,
        "meta_title": meta_tags["meta_title"],
        "meta_description": meta_tags["meta_description"],
        "canonical_url": meta_tags["canonical_url"],
        "sitemap_url": meta_tags["sitemap_url"],
        "primary_language": primary_lang,
        "available_languages": available_langs,
        "has_ssl": has_ssl,
        "cookie_consent": tech_stack["cookie_consent"],
    }

