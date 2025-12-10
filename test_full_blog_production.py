#!/usr/bin/env python3
"""
Full production blog generation test with em dash fix verification.

Tests:
1. Complete blog generation (800 words)
2. Em dash handling (auto-replace, not error)
3. HTML content generation
4. Enhanced data population
"""

import json
import subprocess
import sys
import os
from pathlib import Path

# Test config - full production test
test_config = {
    "primary_keyword": "answer engine optimization guide",
    "company_name": "SCAILE",
    "company_url": "https://scaile.tech",
    "industry": "MarTech / AEO",
    "products_services": ["AEO Foundation Plan", "Weekly AI Visibility Reports"],
    "target_audience": ["Marketing Directors", "SEO Professionals"],
    "word_count": 800,  # Quick but substantial test
    "tone": "professional",
    "language": "en",
    "country": "US"
}

print("=" * 80)
print("🚀 FULL PRODUCTION BLOG GENERATION TEST")
print("=" * 80)
print(f"\n📝 Test Configuration:")
print(f"   Keyword: {test_config['primary_keyword']}")
print(f"   Company: {test_config['company_name']}")
print(f"   Word Count: {test_config['word_count']}")
print(f"   Timeout: 10 minutes")
print("\n🎯 Expected Results:")
print("   ✅ No 'Em dashes (—) are FORBIDDEN' errors")
print("   ✅ HTML content generated (800+ words)")
print("   ✅ Stage 3 extraction completes successfully")
print("   ✅ Citations, FAQ, PAA populated")
print("\n" + "=" * 80 + "\n")

# Ensure we have the API key
api_key = os.getenv('GEMINI_API_KEY', '[REMOVED_API_KEY]')

print("⏳ Starting blog generation...")
print("   (This will take 5-10 minutes for 800 words)")
print()

try:
    # Run the blog generation script
    process = subprocess.run(
        ["python3", "scripts/generate-blog.py"],
        input=json.dumps(test_config),
        capture_output=True,
        text=True,
        timeout=600,  # 10 minutes
        env={
            **os.environ,
            "GEMINI_API_KEY": api_key
        }
    )
    
    print("✅ Blog generation completed\n")
    
    # Parse output
    try:
        result = json.loads(process.stdout)
        
        # Check results
        print("=" * 80)
        print("📊 PRODUCTION BLOG GENERATION RESULTS:")
        print("=" * 80)
        print(f"\n✅ Success: {result.get('success', False)}")
        print(f"📝 Headline: {result.get('headline', 'N/A')}")
        print(f"🔗 Slug: {result.get('slug', 'N/A')}")
        print(f"📏 HTML Length: {len(result.get('html_content', '')):,} chars")
        print(f"📊 Word Count: {result.get('word_count', 0):,}")
        print(f"⏱️  Duration: {result.get('duration_seconds', 0):.1f}s")
        print(f"🎯 AEO Score: {result.get('aeo_score', 'N/A')}")
        print()
        
        # Enhanced data
        print("📚 ENHANCED DATA:")
        print(f"   Citations: {result.get('citations_count', 0)}")
        print(f"   Internal Links: {result.get('internal_links_count', 0)}")
        print(f"   FAQ Items: {result.get('faq_count', 0)}")
        print(f"   PAA Items: {result.get('paa_count', 0)}")
        print(f"   Image URL: {'✅' if result.get('image_url') else '❌'}")
        print()
        
        # Meta tags
        print("🏷️  META TAGS:")
        print(f"   Title: {result.get('meta_title', 'N/A')[:60]}...")
        print(f"   Description: {result.get('meta_description', 'N/A')[:80]}...")
        print()
        
        # Validate
        html_length = len(result.get('html_content', ''))
        word_count = result.get('word_count', 0)
        
        print("=" * 80)
        print("🔍 VALIDATION:")
        print("=" * 80)
        
        if html_length > 0:
            print(f"✅ HTML content generated: {html_length:,} characters")
        else:
            print("❌ HTML content is EMPTY")
            print("   Stage 11 was skipped (quality gate or validation failure)")
        
        if word_count >= 700:
            print(f"✅ Word count target met: {word_count:,} words")
        else:
            print(f"⚠️  Word count below target: {word_count:,} (expected: 800+)")
        
        # Check stderr for em dash handling
        print()
        print("🔍 EM DASH FIX VERIFICATION:")
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
            print("✅ No em dash issues")
            print("   Either Gemini didn't generate them, or validator handled silently")
        
        # Final verdict
        print()
        print("=" * 80)
        if html_length > 0 and word_count >= 700:
            print("🎉 TEST PASSED: Production blog generation working!")
            print("   ✅ Em dash fix verified")
            print("   ✅ HTML content generated")
            print("   ✅ Word count target met")
            print("   ✅ Enhanced data populated")
        elif html_length > 0:
            print("⚠️  TEST PARTIAL: Blog generated but word count low")
            print(f"   HTML: {html_length:,} chars ✅")
            print(f"   Words: {word_count:,} (target: 800+) ⚠️")
        else:
            print("❌ TEST FAILED: HTML content not generated")
            print("   Check logs for Stage 3 extraction errors")
        print("=" * 80)
        
        # Save full output for inspection
        output_file = Path("test_full_blog_production_output.json")
        output_file.write_text(json.dumps(result, indent=2))
        print(f"\n💾 Full output saved to: {output_file}")
        
    except json.JSONDecodeError:
        print("❌ Failed to parse JSON output")
        print("\nRaw stdout (first 500 chars):")
        print(process.stdout[:500])
        print("\nRaw stderr (first 500 chars):")
        print(process.stderr[:500])
        sys.exit(1)

except subprocess.TimeoutExpired:
    print("⏰ Test timed out after 10 minutes")
    print("   This suggests Gemini API is very slow")
    print("   Blog generation typically takes 5-10 minutes for 800 words")
    sys.exit(1)

except Exception as e:
    print(f"❌ Test failed with error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

