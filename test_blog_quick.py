#!/usr/bin/env python3
"""
Quick blog generation test - faster, with direct API key
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

# Simplified test input (shorter content)
test_input = {
    "primary_keyword": "AEO basics",
    "word_count": 800,  # Shorter for speed
    "tone": "professional",
    "company_name": "SCAILE",
    "company_url": "https://scaile.tech",
    "language": "en",
    "country": "US",
    "batch_mode": False,
}

print("=" * 60)
print("QUICK BLOG TEST")
print("=" * 60)
print(f"\nKeyword: {test_input['primary_keyword']}")
print(f"Word Count: {test_input['word_count']}")
print(f"Company: {test_input['company_name']}")

# Check API keys
has_gemini = 'GEMINI_API_KEY' in env_vars and env_vars['GEMINI_API_KEY']
has_openrouter = 'OPENROUTER_API_KEY' in env_vars and env_vars['OPENROUTER_API_KEY']

print(f"\n🔑 API Keys:")
print(f"  GEMINI_API_KEY: {'✅ Set' if has_gemini else '❌ Missing'}")
print(f"  OPENROUTER_API_KEY: {'✅ Set' if has_openrouter else '❌ Missing'}")

if not has_gemini:
    print("\n❌ GEMINI_API_KEY required for blog generation")
    sys.exit(1)

print("\n🔄 Starting generation...")
print(f"⏱️  Start time: {time.strftime('%H:%M:%S')}")

script_path = Path('scripts/generate-blog.py')

try:
    process = subprocess.Popen(
        ['python3', str(script_path)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env_vars,
        text=True
    )
    
    # Start timer
    start = time.time()
    
    # Run with timeout
    try:
        stdout, stderr = process.communicate(input=json.dumps(test_input), timeout=180)
        elapsed = time.time() - start
        
        print(f"⏱️  Completed in: {elapsed:.1f}s")
        
        if stderr:
            print(f"\n⚠️  Stderr ({len(stderr)} chars):")
            print(stderr[:500])  # First 500 chars
        
        if process.returncode != 0:
            print(f"\n❌ Failed with exit code {process.returncode}")
            print("\nOutput:")
            print(stdout[:1000])
            sys.exit(1)
        
        # Parse result
        result = json.loads(stdout)
        
        if not result.get('success'):
            print(f"\n❌ Generation failed: {result.get('error', 'Unknown error')}")
            sys.exit(1)
        
        print("\n✅ SUCCESS!")
        print("=" * 60)
        
        # Quick summary
        print(f"\n📊 Output:")
        print(f"  Headline: {result.get('headline', 'N/A')[:60]}...")
        print(f"  Word Count: {result.get('word_count', 0)}")
        print(f"  AEO Score: {result.get('aeo_score', 'N/A')}")
        print(f"  Duration: {result.get('duration_seconds', 0):.1f}s")
        
        # Enhanced data check
        print(f"\n🔍 Enhanced Data:")
        print(f"  Citations: {result.get('citations_count', 0)}")
        print(f"  Internal Links: {result.get('internal_links_count', 0)}")
        print(f"  FAQ: {result.get('faq_count', 0)}")
        print(f"  PAA: {result.get('paa_count', 0)}")
        print(f"  Meta Title: {'✅' if result.get('meta_title') else '❌'}")
        print(f"  Image: {'✅' if result.get('image_url') else '❌'}")
        
        # Save output
        with open('test_blog_quick_output.json', 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Saved to: test_blog_quick_output.json")
        
        sys.exit(0)
        
    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        print(f"\n❌ Timeout after {elapsed:.1f}s")
        process.kill()
        stdout, stderr = process.communicate()
        if stderr:
            print(f"\nStderr before timeout:")
            print(stderr[:500])
        sys.exit(1)
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

