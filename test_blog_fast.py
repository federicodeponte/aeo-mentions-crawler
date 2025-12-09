#!/usr/bin/env python3
"""
Fast blog test with gemini-2.0-flash-exp
"""

import sys
import json
import subprocess
from pathlib import Path
import os
import time

# Load environment variables
env_path = Path('.env.local')
env_vars = os.environ.copy()

if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

# Override model to use fast version
env_vars['GEMINI_MODEL'] = 'gemini-2.0-flash-exp'

test_input = {
    "primary_keyword": "Answer Engine Optimization basics",
    "word_count": 800,
    "tone": "professional",
    "company_name": "SCAILE",
    "company_url": "https://scaile.tech",
    "language": "en",
    "country": "US",
}

print("=" * 60)
print("FAST BLOG TEST (gemini-2.0-flash-exp)")
print("=" * 60)
print(f"\nKeyword: {test_input['primary_keyword']}")
print(f"Model: gemini-2.0-flash-exp (fast)")
print(f"\n⏱️  Start: {time.strftime('%H:%M:%S')}")

script_path = Path('scripts/generate-blog.py')

try:
    start = time.time()
    
    process = subprocess.Popen(
        ['python3', str(script_path)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env_vars,
        text=True
    )
    
    stdout, stderr = process.communicate(input=json.dumps(test_input), timeout=120)
    elapsed = time.time() - start
    
    print(f"⏱️  Completed in: {elapsed:.1f}s")
    
    if process.returncode != 0:
        print(f"\n❌ Failed")
        print(stdout[:500])
        sys.exit(1)
    
    result = json.loads(stdout)
    
    if not result.get('success'):
        print(f"\n❌ Error: {result.get('error')}")
        sys.exit(1)
    
    print("\n✅ SUCCESS!")
    print("=" * 60)
    
    print(f"\n📊 Result:")
    print(f"  Headline: {result.get('headline', 'N/A')[:60]}...")
    print(f"  Words: {result.get('word_count', 0)}")
    print(f"  AEO Score: {result.get('aeo_score', 'N/A')}")
    print(f"  Duration: {result.get('duration_seconds', 0):.1f}s")
    
    print(f"\n🔍 Enhanced Data:")
    print(f"  Citations: {result.get('citations_count', 0)}")
    print(f"  Links: {result.get('internal_links_count', 0)}")
    print(f"  FAQ: {result.get('faq_count', 0)}")
    print(f"  PAA: {result.get('paa_count', 0)}")
    print(f"  Meta Title: {'✅' if result.get('meta_title') else '❌'}")
    print(f"  Image: {'✅' if result.get('image_url') else '❌'}")
    
    # Quick quality check
    total_enhanced = sum([
        result.get('citations_count', 0) > 0,
        result.get('internal_links_count', 0) > 0,
        result.get('faq_count', 0) > 0,
        result.get('paa_count', 0) > 0,
        bool(result.get('meta_title')),
        bool(result.get('image_url')),
    ])
    
    print(f"\n📈 Data Completeness: {total_enhanced}/6 fields ({total_enhanced/6*100:.0f}%)")
    
    with open('test_blog_fast_output.json', 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\n💾 Saved: test_blog_fast_output.json")
    
    print(f"\n🎉 FULL PIPELINE WORKS! (gemini-2.0-flash-exp)")
    
except subprocess.TimeoutExpired:
    print(f"\n❌ Timeout after {time.time() - start:.1f}s")
    process.kill()
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

