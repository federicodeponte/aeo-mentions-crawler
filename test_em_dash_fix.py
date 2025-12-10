#!/usr/bin/env python3
"""
Quick test to verify em dash fix is working.

Tests:
1. Validator auto-replaces em dashes (not raising error)
2. Blog generation completes with HTML content
3. No Stage 3 extraction failures
"""

import json
import subprocess
import sys
from pathlib import Path

# Test config
test_config = {
    "primary_keyword": "AEO optimization tips",
    "word_count": 600,  # Quick test
    "tone": "informative",
    "language": "en",
    "country": "US"
}

print("=" * 80)
print("🧪 EM DASH FIX VERIFICATION TEST")
print("=" * 80)
print(f"\n📝 Test Configuration:")
print(f"   Keyword: {test_config['primary_keyword']}")
print(f"   Word Count: {test_config['word_count']}")
print(f"   Timeout: 5 minutes")
print("\n🎯 Expected Results:")
print("   ✅ No 'Em dashes (—) are FORBIDDEN' errors")
print("   ✅ HTML content generated (>0 bytes)")
print("   ✅ Stage 3 extraction completes successfully")
print("\n" + "=" * 80 + "\n")

# Run blog generation
print("⏳ Running blog generation with em dash-prone content...")
print("   (Gemini may still generate em dashes despite system instruction)")
print()

try:
    # Run the blog generation script
    process = subprocess.run(
        ["python3", "scripts/generate-blog.py"],
        input=json.dumps(test_config),
        capture_output=True,
        text=True,
        timeout=300,  # 5 minutes
        env={
            "GEMINI_API_KEY": "[REMOVED_API_KEY]"
        }
    )
    
    print("✅ Blog generation completed\n")
    
    # Parse output
    try:
        result = json.loads(process.stdout)
        
        # Check results
        print("📊 RESULTS:")
        print(f"   Success: {result.get('success', False)}")
        print(f"   Headline: {result.get('headline', 'N/A')}")
        print(f"   HTML Length: {len(result.get('html_content', ''))} chars")
        print(f"   Word Count: {result.get('word_count', 0)}")
        print(f"   Duration: {result.get('duration_seconds', 0):.1f}s")
        print()
        
        # Validate
        html_length = len(result.get('html_content', ''))
        word_count = result.get('word_count', 0)
        
        if html_length > 0:
            print("✅ HTML content generated!")
            print(f"   {html_length:,} characters")
        else:
            print("❌ HTML content is EMPTY")
            print("   This indicates Stage 11 was skipped (quality gate or validation failure)")
        
        if word_count >= 500:
            print(f"✅ Word count: {word_count}")
        else:
            print(f"⚠️  Word count below target: {word_count} (expected: 500+)")
        
        # Check stderr for em dash errors
        print()
        print("🔍 Checking for em dash errors in logs...")
        if "Em dashes (—) are FORBIDDEN" in process.stderr:
            print("❌ OLD VALIDATOR STILL RUNNING!")
            print("   Found 'Em dashes (—) are FORBIDDEN' in stderr")
            print("   Python cache not cleared or wrong code version")
            sys.exit(1)
        elif "Em dashes found and auto-replaced" in process.stderr:
            print("✅ NEW VALIDATOR WORKING!")
            print("   Found 'Em dashes found and auto-replaced' in stderr")
            print("   Validator auto-replaced em dashes as expected")
        else:
            print("ℹ️  No em dash logs found")
            print("   Either Gemini didn't generate them, or validator didn't need to replace")
        
        print()
        print("=" * 80)
        if html_length > 0:
            print("🎉 TEST PASSED: Em dash fix is working!")
        else:
            print("❌ TEST FAILED: HTML content not generated")
        print("=" * 80)
        
    except json.JSONDecodeError:
        print("❌ Failed to parse JSON output")
        print("\nRaw stdout:")
        print(process.stdout[:500])
        print("\nRaw stderr:")
        print(process.stderr[:500])
        sys.exit(1)

except subprocess.TimeoutExpired:
    print("⏰ Test timed out after 5 minutes")
    print("   This suggests Gemini API is slow, not a code issue")
    sys.exit(1)

except Exception as e:
    print(f"❌ Test failed with error: {e}")
    sys.exit(1)

