#!/usr/bin/env python3
"""
Test enhanced data extraction after fix.
Verifies that citations, internal links, FAQ, PAA, etc. are properly extracted.
"""

import os
import sys
import json
import subprocess
from datetime import datetime

# Set API key
os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

# Test configuration
test_config = {
    "primary_keyword": "How to optimize for answer engines in 2025",
    "company_url": "https://scaile.tech",
    "company_name": "SCAILE",
    "language": "en",
    "country": "US",
    "word_count": 1500,
    "tone": "professional",
}

print("=" * 80)
print("🧪 TESTING ENHANCED DATA EXTRACTION (POST-FIX)")
print("=" * 80)
print(f"\n📋 Configuration:")
print(f"   Keyword: {test_config['primary_keyword']}")
print(f"   Company: {test_config['company_name']}")
print(f"   Language: {test_config['language']}")
print(f"   Country: {test_config['country']}")
print(f"\n⏳ Generating blog... (this will take 2-3 minutes)\n")

start_time = datetime.now()

# Run generate-blog.py
try:
    result = subprocess.run(
        ['python3', 'scripts/generate-blog.py'],
        input=json.dumps(test_config),
        capture_output=True,
        text=True,
        timeout=300,
        env={**os.environ, 'GEMINI_API_KEY': os.environ['GEMINI_API_KEY']}
    )
    
    duration = (datetime.now() - start_time).total_seconds()
    
    if result.returncode != 0:
        print(f"❌ Generation failed (exit code {result.returncode})")
        print(f"\n📝 STDERR:\n{result.stderr}")
        print(f"\n📝 STDOUT:\n{result.stdout}")
        sys.exit(1)
    
    # Parse output
    output = json.loads(result.stdout)
    
    # Save output for inspection
    with open('test_enhanced_data_fix_output.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"✅ Blog generated in {duration:.1f}s")
    print("\n" + "=" * 80)
    print("📊 ENHANCED DATA VALIDATION")
    print("=" * 80)
    
    # Validate enhanced data
    validations = {
        "success": output.get("success", False),
        "headline": bool(output.get("headline")),
        "html_content": len(output.get("html_content", "")) > 0,
        "word_count": output.get("word_count", 0),
        "citations_count": output.get("citations_count", 0),
        "internal_links_count": output.get("internal_links_count", 0),
        "faq_count": output.get("faq_count", 0),
        "paa_count": output.get("paa_count", 0),
        "toc": bool(output.get("toc")),
        "image_url": bool(output.get("image_url")),
        "meta_title": bool(output.get("meta_title")),
        "meta_description": bool(output.get("meta_description")),
    }
    
    print("\n✅ Basic Metadata:")
    print(f"   ✓ Success: {validations['success']}")
    print(f"   ✓ Headline: {output.get('headline', 'N/A')[:60]}...")
    print(f"   ✓ HTML Content: {len(output.get('html_content', ''))} chars")
    print(f"   ✓ Word Count: {validations['word_count']}")
    print(f"   ✓ Read Time: {output.get('read_time_minutes', 0)} min")
    
    print("\n📊 Enhanced Data:")
    print(f"   {'✅' if validations['citations_count'] > 0 else '❌'} Citations: {validations['citations_count']}")
    print(f"   {'✅' if validations['internal_links_count'] > 0 else '❌'} Internal Links: {validations['internal_links_count']}")
    print(f"   {'✅' if validations['faq_count'] > 0 else '❌'} FAQ Items: {validations['faq_count']}")
    print(f"   {'✅' if validations['paa_count'] > 0 else '❌'} PAA Items: {validations['paa_count']}")
    print(f"   {'✅' if validations['toc'] else '❌'} Table of Contents: {len(output.get('toc', {}))} entries")
    print(f"   {'✅' if validations['image_url'] else '❌'} Image URL: {bool(output.get('image_url'))}")
    
    print("\n🔍 Meta Tags:")
    print(f"   ✓ Meta Title: {output.get('meta_title', 'N/A')[:60]}...")
    print(f"   ✓ Meta Description: {output.get('meta_description', 'N/A')[:60]}...")
    
    # Show sample enhanced data
    if validations['citations_count'] > 0:
        print("\n📚 Sample Citations (first 3):")
        for i, citation in enumerate(output.get('citations', [])[:3]):
            print(f"   {i+1}. {citation.get('title', 'N/A')[:50]}...")
            print(f"      URL: {citation.get('url', 'N/A')[:60]}...")
    
    if validations['internal_links_count'] > 0:
        print("\n🔗 Sample Internal Links (first 3):")
        for i, link in enumerate(output.get('internal_links', [])[:3]):
            print(f"   {i+1}. {link.get('anchor_text', 'N/A')[:50]}...")
            print(f"      URL: {link.get('url', 'N/A')}")
    
    if validations['faq_count'] > 0:
        print("\n❓ Sample FAQ (first 2):")
        for i, faq in enumerate(output.get('faq', [])[:2]):
            print(f"   {i+1}. Q: {faq.get('question', 'N/A')[:60]}...")
            print(f"      A: {faq.get('answer', 'N/A')[:60]}...")
    
    # Overall assessment
    print("\n" + "=" * 80)
    print("🎯 OVERALL ASSESSMENT")
    print("=" * 80)
    
    issues = []
    if validations['citations_count'] == 0:
        issues.append("❌ Citations still empty")
    if validations['internal_links_count'] == 0:
        issues.append("⚠️ Internal links empty (may be expected)")
    if validations['faq_count'] == 0:
        issues.append("❌ FAQ empty")
    if validations['paa_count'] == 0:
        issues.append("⚠️ PAA empty (may be expected)")
    
    if not issues:
        print("\n✅ ✅ ✅ ALL ENHANCED DATA EXTRACTED SUCCESSFULLY! ✅ ✅ ✅")
        print("\n🎉 The fix is working! Enhanced data is now properly populated.")
        print("\n📄 Full output saved to: test_enhanced_data_fix_output.json")
    else:
        print("\n⚠️ Some issues remain:")
        for issue in issues:
            print(f"   {issue}")
        print("\n📄 Full output saved to: test_enhanced_data_fix_output.json")
        print("💡 Review the output file for details.")
    
    print("\n" + "=" * 80)
    
except subprocess.TimeoutExpired:
    print(f"❌ Timeout after 300 seconds")
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"❌ Failed to parse output as JSON: {e}")
    print(f"\n📝 Raw output:\n{result.stdout}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

