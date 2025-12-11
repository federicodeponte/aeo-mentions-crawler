"""Scoring Module v4.0 - Tiered Objective AEO Scoring

v4.0 Overhaul: Hierarchical gated scoring based on AEO reality.

The AEO funnel:
1. CAN AI ACCESS? → If blocked, nothing else matters
2. CAN AI UNDERSTAND? → Schema.org is essential for entity recognition
3. IS CONTENT STRUCTURED? → Technical SEO for content extraction
4. IS IT TRUSTWORTHY? → Authority signals for citation confidence

Tier 0: CRITICAL (Gate)
- Blocks ALL AI crawlers → Max score = 10
- Has noindex directive → Max score = 5

Tier 1: ESSENTIAL (Floor)
- No Organization schema → Max score = 50
- Missing title OR meta → Max score = 50

Tier 2: IMPORTANT (Ceiling)  
- Incomplete schema → Max score = 80
- Poor content quality → Max score = 80

Tier 3: EXCELLENCE
- Full optimization → Score up to 100
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from bs4 import BeautifulSoup


def evaluate_tier0_critical(issues: List[Dict[str, Any]]) -> Tuple[bool, int, str]:
    """Evaluate Tier 0: Critical gates.
    
    Deal-breakers that cap your maximum score:
    - Blocking ALL AI crawlers = invisible to AI
    - noindex directive = won't be indexed
    
    Returns:
        Tuple of (passed, max_score_cap, reason)
    """
    # Check AI crawler access
    ai_crawler_checks = ['gptbot_access', 'claude_access', 'perplexitybot_access', 'ccbot_access']
    blocked_crawlers = []
    
    for issue in issues:
        if issue.get('check') in ai_crawler_checks and not issue.get('passed', False):
            blocked_crawlers.append(issue.get('check'))
    
    # If ALL 4 major AI crawlers are blocked
    if len(blocked_crawlers) >= 4:
        return (False, 10, f"Blocks all AI crawlers - invisible to AI")
    
    # If 3 blocked (most AI can't access)
    if len(blocked_crawlers) >= 3:
        return (False, 25, f"Blocks most AI crawlers ({len(blocked_crawlers)}/4)")
    
    # Check for noindex directive
    for issue in issues:
        if issue.get('check') == 'robots_meta':
            message = issue.get('message', '').lower()
            if 'noindex' in message and not issue.get('passed', False):
                return (False, 5, "Has noindex - won't be indexed by AI")
    
    return (True, 100, "AI can access site")


def evaluate_tier1_essential(issues: List[Dict[str, Any]]) -> Tuple[bool, int, str]:
    """Evaluate Tier 1: Essential requirements.
    
    Minimum requirements for AI to understand your site:
    - Organization schema EXISTS (not completeness - that's tier2)
    - Title tag EXISTS (not optimal length - that's tier2)
    - HTTPS (trust baseline)
    
    Returns:
        Tuple of (passed, max_score_cap, reason)
    """
    has_org_schema = False
    has_title = False
    has_https = False
    
    for issue in issues:
        check = issue.get('check', '')
        passed = issue.get('passed', False)
        message = issue.get('message', '').lower()
        
        if check == 'org_schema_completeness':
            # Schema EXISTS if the message doesn't say "No Organization schema"
            # Even incomplete schema (40%) means it exists
            if 'no organization schema' not in message:
                has_org_schema = True
        elif check == 'title_tag':
            # Title EXISTS if message doesn't say "Missing title tag"
            # Too long/short titles still exist - they're just not optimal
            if 'missing title' not in message:
                has_title = True
        elif check == 'https' and passed:
            has_https = True
    
    missing = []
    if not has_org_schema:
        missing.append("Organization schema")
    if not has_title:
        missing.append("title tag")
    if not has_https:
        missing.append("HTTPS")
    
    if not has_org_schema:
        # No Organization schema is the biggest issue - AI can't identify you
        return (False, 45, f"Missing Organization schema - AI can't identify entity")
    
    if missing:
        return (False, 55, f"Missing essentials: {', '.join(missing)}")
    
    return (True, 100, "Has essential elements")


def evaluate_tier2_important(issues: List[Dict[str, Any]]) -> Tuple[bool, int, str]:
    """Evaluate Tier 2: Important optimizations.
    
    Important for good AI visibility (focused on what actually matters):
    - Complete Organization schema (logo, description) - CRITICAL
    - sameAs links for knowledge graph - IMPORTANT  
    - Meta description - IMPORTANT
    - Good content length - HELPFUL
    
    Note: FAQ/Article schemas are NOT required - they're for content pages, 
    not homepages. A homepage with complete Organization schema is excellent.
    
    Returns:
        Tuple of (passed, max_score_cap, reason)
    """
    org_complete = False
    org_partial = False
    has_meta_desc = False
    good_content = False
    has_sameas = False
    
    for issue in issues:
        check = issue.get('check', '')
        passed = issue.get('passed', False)
        message = issue.get('message', '')
        
        if check == 'org_schema_completeness':
            if 'no organization schema' not in message.lower():
                org_partial = True  # Schema exists
                # Check completeness percentage
                match = re.search(r'(\d+)%', message or '0%')
                if match:
                    completeness = int(match.group(1))
                    if completeness >= 70:
                        org_complete = True
        elif check == 'meta_description':
            # Meta exists if not "Missing"
            if 'missing' not in message.lower():
                has_meta_desc = True
        elif check == 'content_word_count' and passed:
            good_content = True
        elif check == 'sameas_links' and passed:
            has_sameas = True
    
    # Scoring logic based on what matters for AEO
    # Priority: Organization completeness > sameAs > meta > content
    
    critical_issues = []  # Cap at 70
    important_issues = []  # Cap at 80
    minor_issues = []  # Cap at 90
    
    if org_partial and not org_complete:
        important_issues.append("incomplete Organization schema")
    
    if not has_sameas:
        important_issues.append("no sameAs links")
    
    if not has_meta_desc:
        minor_issues.append("no meta description")
    
    if not good_content:
        minor_issues.append("thin content")
    
    # Calculate cap
    if len(critical_issues) > 0:
        return (False, 70, f"Critical: {', '.join(critical_issues)}")
    elif len(important_issues) >= 2:
        return (False, 75, f"Issues: {', '.join(important_issues)}")
    elif len(important_issues) == 1:
        return (False, 85, f"Issue: {important_issues[0]}")
    elif len(minor_issues) >= 2:
        return (False, 90, f"Minor issues: {', '.join(minor_issues)}")
    elif len(minor_issues) == 1:
        return (False, 95, f"Minor: {minor_issues[0]}")
    
    return (True, 100, "Excellent AEO optimization")


def calculate_base_score(issues: List[Dict[str, Any]]) -> float:
    """Calculate base score from all checks (0-100).
    
    Simple calculation: passed checks / total checks, weighted by impact.
    """
    total_impact = 0
    earned_impact = 0
    
    for issue in issues:
        impact = issue.get('score_impact', 5)
        total_impact += impact
        
        if issue.get('passed', False):
            earned_impact += impact
        elif issue.get('severity') == 'notice':
            earned_impact += impact * 0.7  # Notices get partial credit
        elif issue.get('severity') == 'warning':
            earned_impact += impact * 0.3  # Warnings get less credit
        # Errors get 0 credit
    
    if total_impact > 0:
        return (earned_impact / total_impact) * 100
    return 0.0


def calculate_tiered_score(issues: List[Dict[str, Any]]) -> Tuple[float, Dict[str, Any]]:
    """Calculate final score using tiered gating system.
    
    The score is the MINIMUM of:
    - Tier 0 cap (critical gates)
    - Tier 1 cap (essential requirements)
    - Tier 2 cap (important optimizations)
    - Base score (actual check performance)
    
    Returns:
        Tuple of (final_score, tier_details)
    """
    # Evaluate each tier
    tier0_passed, tier0_cap, tier0_reason = evaluate_tier0_critical(issues)
    tier1_passed, tier1_cap, tier1_reason = evaluate_tier1_essential(issues)
    tier2_passed, tier2_cap, tier2_reason = evaluate_tier2_important(issues)
    
    # Calculate base score from checks
    base_score = calculate_base_score(issues)
    
    # Final score is capped by all tiers
    final_score = min(tier0_cap, tier1_cap, tier2_cap, base_score)
    
    # Determine which tier is limiting the score
    limiting_tier = "base"
    limiting_reason = "Check performance"
    
    if tier0_cap <= final_score + 1:
        limiting_tier = "tier0"
        limiting_reason = tier0_reason
    elif tier1_cap <= final_score + 1:
        limiting_tier = "tier1"
        limiting_reason = tier1_reason
    elif tier2_cap <= final_score + 1:
        limiting_tier = "tier2"
        limiting_reason = tier2_reason
    
    tier_details = {
        'tier0': {'passed': tier0_passed, 'cap': tier0_cap, 'reason': tier0_reason},
        'tier1': {'passed': tier1_passed, 'cap': tier1_cap, 'reason': tier1_reason},
        'tier2': {'passed': tier2_passed, 'cap': tier2_cap, 'reason': tier2_reason},
        'base_score': round(base_score, 1),
        'limiting_tier': limiting_tier,
        'limiting_reason': limiting_reason,
    }
    
    return (round(final_score, 1), tier_details)


def calculate_overall_score(issues: List[Dict[str, Any]]) -> float:
    """Calculate overall health score using tiered system.
    
    v4.0: Uses hierarchical gating instead of weighted averages.
    """
    score, _ = calculate_tiered_score(issues)
    return score


def calculate_grade(score: float) -> str:
    """Convert score to letter grade.
    
    v4.0: Adjusted for tiered scoring reality.
    
    - A+ (90+): Exceptional - passes all tiers with excellence
    - A (80-89): Excellent - full schema, good optimization
    - B (65-79): Good - has schema, some gaps
    - C (45-64): Fair - missing schema or has issues
    - D (25-44): Poor - major gaps, partial AI access
    - F (<25): Critical - blocks AI or fundamental issues
    """
    if score >= 90:
        return 'A+'
    elif score >= 80:
        return 'A'
    elif score >= 65:
        return 'B'
    elif score >= 45:
        return 'C'
    elif score >= 25:
        return 'D'
    else:
        return 'F'


def calculate_visibility_band(score: float) -> tuple:
    """Convert score to visibility band and color.
    
    Returns:
        Tuple of (band_name, hex_color)
    """
    if score >= 80:
        return ('Excellent', '#22c55e')  # Green
    elif score >= 65:
        return ('Strong', '#84cc16')     # Lime
    elif score >= 45:
        return ('Moderate', '#eab308')   # Yellow
    elif score >= 25:
        return ('Weak', '#f97316')       # Orange
    else:
        return ('Critical', '#ef4444')   # Red


def calculate_category_clarity_score(
    soup: BeautifulSoup,
    schema_types: List[str],
    org_schema: Optional[Dict]
) -> int:
    """Calculate Category Clarity Score (0-100).
    
    Measures how clearly the website defines its category/purpose.
    """
    score = 0
    
    # Get meta elements
    title = soup.find('title')
    title_text = title.text.strip().lower() if title else ""
    
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    meta_text = str(meta_desc.get('content', '')).strip().lower() if meta_desc else ""
    
    h1_tags = soup.find_all('h1')
    h1_text = h1_tags[0].get_text(strip=True).lower() if h1_tags else ""
    
    # Helper: Extract meaningful words
    stop_words = {'the', 'and', 'for', 'with', 'your', 'that', 'this', 'from', 'have', 'will', 'more', 'about'}
    def extract_keywords(text: str) -> set:
        words = re.findall(r'\b[a-z]{4,}\b', text.lower())
        return set(w for w in words if w not in stop_words)
    
    # 1. Title present and meaningful (15 points)
    if title_text and len(title_text) >= 20:
        score += 15
    elif title_text:
        score += 8
    
    # 2. Meta description present and meaningful (15 points)
    if meta_text and len(meta_text) >= 50:
        score += 15
    elif meta_text:
        score += 8
    
    # 3. H1 present (10 points)
    if h1_text:
        score += 10
    
    # 4. Schema types indicate business type (20 points)
    business_schemas = ['Organization', 'LocalBusiness', 'Corporation', 'Company', 
                       'ProfessionalService', 'SoftwareApplication', 'WebApplication']
    if any(t in schema_types for t in business_schemas):
        score += 20
    elif schema_types:
        score += 10
    
    # 5. Organization description present (10 points)
    if org_schema and org_schema.get('description'):
        score += 10
    
    # 6. Keyword consistency (30 points total)
    title_keywords = extract_keywords(title_text)
    meta_keywords = extract_keywords(meta_text)
    h1_keywords = extract_keywords(h1_text)
    
    if title_keywords and h1_keywords:
        overlap = title_keywords.intersection(h1_keywords)
        if len(overlap) >= 2:
            score += 10
        elif len(overlap) >= 1:
            score += 5
    
    if title_keywords and meta_keywords:
        overlap = title_keywords.intersection(meta_keywords)
        if len(overlap) >= 2:
            score += 10
        elif len(overlap) >= 1:
            score += 5
    
    if meta_keywords and h1_keywords:
        overlap = meta_keywords.intersection(h1_keywords)
        if len(overlap) >= 2:
            score += 10
        elif len(overlap) >= 1:
            score += 5
    
    return min(100, score)


def calculate_entity_strength_score(
    org_schema: Optional[Dict],
    same_as_count: int,
    soup: BeautifulSoup
) -> int:
    """Calculate Entity Strength Score (0-100).
    
    Measures entity recognition and structured data strength.
    """
    score = 0
    
    title = soup.find('title')
    title_text = title.text.strip() if title else ""
    
    h1_tags = soup.find_all('h1')
    h1_text = h1_tags[0].get_text(strip=True) if h1_tags else ""
    
    # 1. Organization schema completeness (50 points)
    if org_schema:
        if org_schema.get('name'):
            score += 15
        if org_schema.get('url'):
            score += 5
        if org_schema.get('logo'):
            score += 10
        if org_schema.get('description'):
            score += 15
        if org_schema.get('address') or org_schema.get('location'):
            score += 5
    
    # 2. sameAs links (30 points)
    if same_as_count >= 5:
        score += 30
    elif same_as_count >= 3:
        score += 25
    elif same_as_count >= 2:
        score += 15
    elif same_as_count >= 1:
        score += 10
    
    # 3. Brand consistency (20 points)
    brand_name = org_schema.get('name', '') if org_schema else ''
    
    if not brand_name and title_text:
        parts = re.split(r'\s*[|\-–:]\s*', title_text)
        if parts:
            potential_brand = parts[0].strip()
            if 2 < len(potential_brand) < 40:
                brand_name = potential_brand
    
    if brand_name and len(brand_name) > 2:
        brand_lower = brand_name.lower()
        title_lower = title_text.lower()
        h1_lower = h1_text.lower()
        
        if brand_lower in title_lower:
            score += 10
        
        if brand_lower in h1_lower:
            score += 10
        elif brand_name and h1_text:
            brand_words = set(w.lower() for w in brand_name.split() if len(w) > 2)
            h1_words = set(w.lower() for w in h1_text.split() if len(w) > 2)
            if brand_words and len(brand_words.intersection(h1_words)) > 0:
                score += 5
    
    return min(100, score)


def calculate_authority_signal_score(issues: List[Dict[str, Any]]) -> int:
    """Calculate Authority Signal Score (0-100)."""
    score = 0
    
    authority_points = {
        'about_page': 25,
        'contact_info': 25,
        'social_proof_links': 40,
    }
    
    for issue in issues:
        check_name = issue.get('check', '')
        
        if check_name in authority_points and issue.get('passed', False):
            score += authority_points[check_name]
        
        if check_name == 'https' and issue.get('passed', False):
            score += 5
        if check_name == 'canonical_tag' and issue.get('passed', False):
            score += 5
    
    return min(100, score)


def count_issues_by_severity(issues: List[Dict[str, Any]]) -> Dict[str, int]:
    """Count issues by severity level."""
    counts = {
        'passed': 0,
        'errors': 0,
        'warnings': 0,
        'notices': 0,
    }
    
    for issue in issues:
        severity = issue.get('severity', 'notice')
        if severity == 'pass':
            counts['passed'] += 1
        elif severity == 'error':
            counts['errors'] += 1
        elif severity == 'warning':
            counts['warnings'] += 1
        elif severity == 'notice':
            counts['notices'] += 1
    
    return counts
