#!/usr/bin/env python3
"""Quick blog generation test with quality gate bypass"""

import sys
import os
import json
import subprocess
from pathlib import Path

# Set API key
os.environ['GEMINI_API_KEY'] = '***REMOVED***'

print("=" * 60)
print("QUICK BLOG GENERATION TEST (Quality Gate Bypass)")
print("=" * 60)

# Test input
test_input = {
    "primary_keyword": "AEO basics",
    "company_url": "https://scaile.tech",
    "language": "en",
    "country": "US",
    "word_count": 400,  # Short for speed
    "tone": "professional",
    "company_context": {
        "company_name": "SCAILE",
        "industry": "AEO Services",
        "products": ["AI Visibility Engine", "AEO Foundation Plan"],
        "target_audience": "B2B SaaS companies"
    }
}

print(f"\n📝 Test Config:")
print(f"  Keyword: {test_input['primary_keyword']}")
print(f"  Word Count: {test_input['word_count']}")
print(f"  Company: {test_input['company_context']['company_name']}")

print(f"\n⏱️  Starting generation...")
print("-" * 60)

# Run generation
script_path = Path(__file__).parent / 'scripts' / 'generate-blog.py'
proc = subprocess.run(
    ['python3', str(script_path)],
    input=json.dumps(test_input),
    capture_output=True,
    text=True,
    timeout=240  # 4 minutes
)

print("-" * 60)

if proc.returncode == 0:
    try:
        result = json.loads(proc.stdout)
        print("\n✅ GENERATION COMPLETE")
        print("=" * 60)
        print(f"\n📊 Results:")
        print(f"  Success: {result.get('success')}")
        print(f"  Job ID: {result.get('job_id')}")
        print(f"  Headline: {result.get('headline', 'N/A')[:60]}...")
        print(f"  Word Count: {result.get('word_count', 0)}")
        print(f"  AEO Score: {result.get('aeo_score', 'N/A')}")
        print(f"  Duration: {result.get('duration_seconds', 0):.1f}s")
        
        html_content = result.get('html_content', '')
        print(f"\n📄 HTML Content:")
        print(f"  Length: {len(html_content)} chars")
        print(f"  Preview: {html_content[:150] if html_content else 'EMPTY'}...")
        
        print(f"\n🔍 Enhanced Data:")
        print(f"  Citations: {result.get('citations_count', 0)}")
        print(f"  Internal Links: {result.get('internal_links_count', 0)}")
        print(f"  FAQ: {result.get('faq_count', 0)}")
        print(f"  PAA: {result.get('paa_count', 0)}")
        print(f"  Image URL: {'✅' if result.get('image_url') else '❌'}")
        
        if html_content:
            print("\n✅ HTML GENERATION SUCCESSFUL - QUALITY GATE BYPASS WORKING!")
        else:
            print("\n⚠️  HTML is still empty - quality gate may still be blocking")
        
    except json.JSONDecodeError as e:
        print(f"\n❌ Failed to parse JSON output: {e}")
        print(f"stdout: {proc.stdout[:500]}")
else:
    print(f"\n❌ Generation failed (exit code {proc.returncode})")
    print(f"stderr: {proc.stderr[:1000]}")
