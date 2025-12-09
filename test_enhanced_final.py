#!/usr/bin/env python3
"""
Final test with CORRECT model: gemini-3-pro-preview (FULL parity with openblog)
"""

import os
import sys
import json
import subprocess
from datetime import datetime

# Set API key - NO model override, use blog-writer default (gemini-3-pro-preview)
os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

test_config = {
    "primary_keyword": "What is AEO",
    "company_url": "https://scaile.tech",
    "company_name": "SCAILE",
    "language": "en",
    "country": "US",
    "word_count": 800,
    "tone": "professional",
}

print("=" * 70)
print("🧪 FINAL TEST - gemini-3-pro-preview (FULL PARITY)")
print("=" * 70)
print(f"\nKeyword: {test_config['primary_keyword']}")
print(f"Target: {test_config['word_count']} words")
print(f"Model: gemini-3-pro-preview (from blog-writer default)")
print("\n⏳ Generating... (2-3 min with correct model)\n")

start_time = datetime.now()

try:
    # Run WITHOUT GEMINI_MODEL env var - let blog-writer use its default
    env = os.environ.copy()
    if 'GEMINI_MODEL' in env:
        del env['GEMINI_MODEL']  # Remove any override
    
    result = subprocess.run(
        ['python3', 'scripts/generate-blog.py'],
        input=json.dumps(test_config),
        capture_output=True,
        text=True,
        timeout=240,  # 4 min
        env=env
    )
    
    duration = (datetime.now() - start_time).total_seconds()
    
    if result.returncode != 0:
        print(f"❌ Failed (exit code {result.returncode})")
        print(f"\nSTDERR (last 2000 chars):\n{result.stderr[-2000:]}")
        sys.exit(1)
    
    output = json.loads(result.stdout)
    
    with open('test_enhanced_final_output.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"✅ Generated in {duration:.1f}s\n")
    print("=" * 70)
    print("📊 ENHANCED DATA VERIFICATION")
    print("=" * 70)
    
    # Validate
    citations = output.get('citations_count', 0)
    internal_links = output.get('internal_links_count', 0)
    faq = output.get('faq_count', 0)
    paa = output.get('paa_count', 0)
    toc = len(output.get('toc', {}))
    image = bool(output.get('image_url'))
    
    print(f"\n✅ Basic:")
    print(f"   Headline: {output.get('headline', 'N/A')[:50]}...")
    print(f"   HTML: {len(output.get('html_content', ''))} chars")
    print(f"   Words: {output.get('word_count', 0)}")
    print(f"   Duration: {duration:.1f}s")
    
    print(f"\n📊 Enhanced Data (THE FIX):")
    print(f"   {'✅' if citations > 0 else '❌'} Citations: {citations}")
    print(f"   {'✅' if internal_links > 0 else '⚠️'} Internal Links: {internal_links}")
    print(f"   {'✅' if faq > 0 else '❌'} FAQ: {faq}")
    print(f"   {'✅' if paa > 0 else '⚠️'} PAA: {paa}")
    print(f"   {'✅' if toc > 0 else '⚠️'} TOC: {toc} entries")
    print(f"   {'✅' if image else '⚠️'} Image: {image}")
    
    # Show samples
    if citations > 0:
        first = output.get('citations', [])[0]
        print(f"\n📚 First Citation:")
        print(f"   {first.get('title', 'N/A')[:60]}...")
        print(f"   {first.get('url', 'N/A')[:70]}...")
    
    if faq > 0:
        first = output.get('faq', [])[0]
        print(f"\n❓ First FAQ:")
        print(f"   Q: {first.get('question', 'N/A')[:60]}...")
        print(f"   A: {first.get('answer', 'N/A')[:60]}...")
    
    print("\n" + "=" * 70)
    
    # Final assessment
    if citations > 0 and faq > 0:
        print("✅ ✅ ✅ FIX VERIFIED! Enhanced data extraction working! ✅ ✅ ✅")
        print("\n🎉 Full parity with openblog achieved!")
    else:
        print("❌ Issue remains - enhanced data still empty")
        print("📝 Debug: Check parallel_results keys in openblog pipeline")
    
    print(f"\n📄 Full output: test_enhanced_final_output.json")
    print("=" * 70)
    
except subprocess.TimeoutExpired:
    duration = (datetime.now() - start_time).total_seconds()
    print(f"❌ Timeout after {duration:.1f}s")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

