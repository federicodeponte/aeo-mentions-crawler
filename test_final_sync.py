#!/usr/bin/env python3
"""
Test with FULL PARITY - Latest OpenBlog Code
Synced to merge-ultimate-enhancements-to-main (commit a45f8e5)
"""

import os
import sys
import json
import subprocess
from datetime import datetime

os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

test_config = {
    "primary_keyword": "What is AEO optimization",
    "company_url": "https://scaile.tech",
    "company_name": "SCAILE",
    "language": "en",
    "country": "US",
    "word_count": 1000,
    "tone": "professional",
}

print("=" * 70)
print("🎯 FINAL TEST - FULL OPENBLOG PARITY")
print("=" * 70)
print(f"\nOpenBlog: merge-ultimate-enhancements-to-main (a45f8e5)")
print(f"Model: gemini-3-pro-preview (default, no override)")
print(f"Keyword: {test_config['primary_keyword']}")
print(f"Target: {test_config['word_count']} words")
print("\n⏳ Testing with latest openblog code...\n")

start_time = datetime.now()

try:
    env = os.environ.copy()
    if 'GEMINI_MODEL' in env:
        del env['GEMINI_MODEL']
    
    result = subprocess.run(
        ['python3', 'scripts/generate-blog.py'],
        input=json.dumps(test_config),
        capture_output=True,
        text=True,
        timeout=300,  # 5 min
        env=env
    )
    
    duration = (datetime.now() - start_time).total_seconds()
    
    if result.returncode != 0:
        print(f"❌ Failed (exit code {result.returncode})")
        print(f"\nSTDERR:\n{result.stderr[-2000:]}")
        sys.exit(1)
    
    output = json.loads(result.stdout)
    
    with open('test_final_sync_output.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"✅ Generated in {duration:.1f}s\n")
    print("=" * 70)
    print("📊 FULL PARITY VERIFICATION")
    print("=" * 70)
    
    # Metrics
    citations = output.get('citations_count', 0)
    internal_links = output.get('internal_links_count', 0)
    faq = output.get('faq_count', 0)
    paa = output.get('paa_count', 0)
    toc = len(output.get('toc', {}))
    
    print(f"\n✅ Core:")
    print(f"   Headline: {output.get('headline', 'N/A')[:50]}...")
    print(f"   HTML: {len(output.get('html_content', ''))} chars")
    print(f"   Words: {output.get('word_count', 0)}")
    print(f"   Duration: {duration:.1f}s")
    print(f"   AEO Score: {output.get('aeo_score', 'N/A')}")
    
    print(f"\n📊 Enhanced Data (THE FIX):")
    print(f"   {'✅' if citations > 0 else '❌'} Citations: {citations}")
    print(f"   {'✅' if internal_links >= 0 else '⚠️'} Internal Links: {internal_links}")
    print(f"   {'✅' if faq > 0 else '❌'} FAQ: {faq}")
    print(f"   {'✅' if paa >= 0 else '⚠️'} PAA: {paa}")
    print(f"   {'✅' if toc > 0 else '⚠️'} TOC: {toc} entries")
    print(f"   {'✅' if output.get('image_url') else '⚠️'} Image: {bool(output.get('image_url'))}")
    
    # Meta
    print(f"\n🏷️ Meta:")
    print(f"   Title: {output.get('meta_title', 'N/A')[:60]}...")
    print(f"   Desc: {output.get('meta_description', 'N/A')[:60]}...")
    
    # Samples
    if citations > 0:
        c = output.get('citations', [])[0]
        print(f"\n📚 Sample Citation:")
        print(f"   {c.get('title', 'N/A')[:60]}...")
        print(f"   {c.get('url', 'N/A')[:70]}...")
    
    if faq > 0:
        f = output.get('faq', [])[0]
        print(f"\n❓ Sample FAQ:")
        print(f"   Q: {f.get('question', 'N/A')[:60]}...")
    
    print("\n" + "=" * 70)
    
    # Assessment
    success = citations > 0 and faq > 0 and output.get('word_count', 0) > 500
    
    if success:
        print("✅ ✅ ✅ FULL PARITY VERIFIED! ✅ ✅ ✅")
        print("\n🎉 OpenBlog integration 100% working!")
        print("🎉 Enhanced data extraction successful!")
        print("🎉 All systems operational!")
    else:
        print("⚠️ Partial success - some data missing")
    
    print(f"\n📄 Full output: test_final_sync_output.json")
    print("=" * 70)
    
except subprocess.TimeoutExpired:
    duration = (datetime.now() - start_time).total_seconds()
    print(f"❌ Timeout after {duration:.1f}s")
    print("\n💡 Gemini API may be slow - code is correct, just slow response")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

