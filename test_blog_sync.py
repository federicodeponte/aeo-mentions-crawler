#!/usr/bin/env python3
"""Quick synchronous blog generation test"""
import json
import subprocess
import os

test_config = {
    "primary_keyword": "AEO tips",
    "company_name": "SCAILE",
    "company_url": "https://scaile.tech",
    "word_count": 400,  # Super quick
    "tone": "informative",
    "language": "en",
    "country": "US"
}

print("🚀 Running synchronous blog generation test (400 words)...")
print(f"📝 Keyword: {test_config['primary_keyword']}")
print("⏱️  Expected: 3-5 minutes\n")

try:
    result = subprocess.run(
        ["python3", "scripts/generate-blog.py"],
        input=json.dumps(test_config),
        capture_output=True,
        text=True,
        timeout=600,
        env={**os.environ, "GEMINI_API_KEY": "[REMOVED_API_KEY]"}
    )
    
    print(f"✅ Exit code: {result.returncode}\n")
    
    if result.stdout:
        try:
            data = json.loads(result.stdout)
            print("📊 RESULTS:")
            print(f"   Success: {data.get('success')}")
            print(f"   Headline: {data.get('headline', 'N/A')}")
            print(f"   HTML Length: {len(data.get('html_content', '')):,} chars")
            print(f"   Word Count: {data.get('word_count', 0):,}")
            print(f"   Duration: {data.get('duration_seconds', 0):.1f}s")
            
            if data.get('html_content'):
                print("\n✅ HTML CONTENT GENERATED!")
            else:
                print("\n❌ HTML CONTENT EMPTY")
                
        except json.JSONDecodeError as e:
            print(f"❌ JSON parse error: {e}")
            print(f"First 500 chars of stdout:\n{result.stdout[:500]}")
    else:
        print("⚠️  No stdout")
        
    if result.stderr:
        print(f"\n📋 Stderr (first 1000 chars):\n{result.stderr[:1000]}")
        
except subprocess.TimeoutExpired:
    print("⏰ Timed out after 10 minutes")
except Exception as e:
    print(f"❌ Error: {e}")

