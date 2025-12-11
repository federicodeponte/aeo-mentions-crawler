#!/usr/bin/env python3
"""Quick test of enhanced data extraction with shorter content."""

import os
import sys
import json
import subprocess
from datetime import datetime

# Get API key from environment variable (never hardcode!)
if 'GEMINI_API_KEY' not in os.environ:
    print("❌ GEMINI_API_KEY environment variable not set")
    print("Please set it with: export GEMINI_API_KEY=your_key_here")
    sys.exit(1)

test_config = {
    "primary_keyword": "What is AEO",
    "company_url": "https://scaile.tech",
    "company_name": "SCAILE",
    "language": "en",
    "country": "US",
    "word_count": 800,  # Shorter for faster test
    "tone": "professional",
}

print("🧪 Quick Enhanced Data Test")
print(f"Keyword: {test_config['primary_keyword']}")
print(f"Target: {test_config['word_count']} words")
print("\n⏳ Generating... (should take 1-2 min)\n")

start_time = datetime.now()

try:
    result = subprocess.run(
        ['python3', 'scripts/generate-blog.py'],
        input=json.dumps(test_config),
        capture_output=True,
        text=True,
        timeout=180,  # 3 min timeout
        env={**os.environ, 'GEMINI_API_KEY': os.environ['GEMINI_API_KEY']}
    )
    
    duration = (datetime.now() - start_time).total_seconds()
    
    if result.returncode != 0:
        print(f"❌ Failed (exit code {result.returncode})")
        print(f"\nSTDERR:\n{result.stderr[-2000:]}")  # Last 2000 chars
        sys.exit(1)
    
    output = json.loads(result.stdout)
    
    with open('test_enhanced_quick_output.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"✅ Generated in {duration:.1f}s\n")
    print("=" * 60)
    print("📊 ENHANCED DATA RESULTS")
    print("=" * 60)
    
    # Key metrics
    print(f"\n✅ Basic:")
    print(f"   Headline: {output.get('headline', 'N/A')[:50]}...")
    print(f"   HTML: {len(output.get('html_content', ''))} chars")
    print(f"   Words: {output.get('word_count', 0)}")
    
    print(f"\n📊 Enhanced Data:")
    citations = output.get('citations_count', 0)
    internal_links = output.get('internal_links_count', 0)
    faq = output.get('faq_count', 0)
    paa = output.get('paa_count', 0)
    toc_entries = len(output.get('toc', {}))
    
    print(f"   {'✅' if citations > 0 else '❌'} Citations: {citations}")
    print(f"   {'✅' if internal_links > 0 else '⚠️'} Internal Links: {internal_links}")
    print(f"   {'✅' if faq > 0 else '❌'} FAQ: {faq}")
    print(f"   {'✅' if paa > 0 else '⚠️'} PAA: {paa}")
    print(f"   {'✅' if toc_entries > 0 else '⚠️'} TOC: {toc_entries} entries")
    print(f"   {'✅' if output.get('image_url') else '⚠️'} Image: {bool(output.get('image_url'))}")
    
    # Show first citation if exists
    if citations > 0:
        first_citation = output.get('citations', [])[0]
        print(f"\n📚 First Citation:")
        print(f"   Title: {first_citation.get('title', 'N/A')[:50]}...")
        print(f"   URL: {first_citation.get('url', 'N/A')[:60]}...")
    
    # Show first FAQ if exists
    if faq > 0:
        first_faq = output.get('faq', [])[0]
        print(f"\n❓ First FAQ:")
        print(f"   Q: {first_faq.get('question', 'N/A')[:50]}...")
        print(f"   A: {first_faq.get('answer', 'N/A')[:50]}...")
    
    print("\n" + "=" * 60)
    
    # Assessment
    if citations > 0 and faq > 0:
        print("✅ ✅ ✅ FIX VERIFIED! Enhanced data is working! ✅ ✅ ✅")
    elif citations > 0 or faq > 0:
        print("⚠️ Partial success - some enhanced data present")
    else:
        print("❌ Issue remains - enhanced data still empty")
    
    print(f"\n📄 Full output: test_enhanced_quick_output.json")
    print("=" * 60)
    
except subprocess.TimeoutExpired:
    print(f"❌ Timeout after 180s")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

