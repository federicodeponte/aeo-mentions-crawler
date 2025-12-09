#!/usr/bin/env python3
"""
Single Blog Generation Test - Quality Gate Bypass Verification
Tests full pipeline with company context
"""

import sys
import os
import json
import subprocess
from pathlib import Path
from datetime import datetime

# Set API key
os.environ['GEMINI_API_KEY'] = '***REMOVED***'

print("=" * 70)
print("SINGLE BLOG GENERATION TEST - Quality Gate Bypass")
print("=" * 70)

# Test input - realistic blog config
test_input = {
    "primary_keyword": "How to optimize for answer engines in 2025",
    "company_url": "https://scaile.tech",
    "language": "en",
    "country": "US",
    "word_count": 800,
    "tone": "professional",
    "company_context": {
        "company_name": "SCAILE Technologies",
        "industry": "AEO & AI Visibility Services",
        "products": ["AI Visibility Engine", "AEO Foundation Plan", "Shadow Demand Discovery"],
        "target_audience": "B2B SaaS companies, marketing directors",
        "pain_points": ["Low AI visibility", "Missing from ChatGPT/Perplexity", "Losing to competitors in AI search"],
        "differentiators": ["Automated AEO", "Weekly AI visibility reports", "Full content production"]
    }
}

print(f"\n📝 Test Configuration:")
print(f"  Keyword: {test_input['primary_keyword']}")
print(f"  Word Count: {test_input['word_count']}")
print(f"  Company: {test_input['company_context']['company_name']}")
print(f"  Products: {len(test_input['company_context']['products'])}")

print(f"\n⏱️  Starting generation: {datetime.now().strftime('%H:%M:%S')}")
print(f"  Expected duration: 4-7 minutes")
print("-" * 70)

start_time = datetime.now()

# Run generation
script_path = Path(__file__).parent / 'scripts' / 'generate-blog.py'
try:
    proc = subprocess.run(
        ['python3', str(script_path)],
        input=json.dumps(test_input),
        capture_output=True,
        text=True,
        timeout=600  # 10 minutes max
    )
    
    duration = (datetime.now() - start_time).total_seconds()
    
    print("-" * 70)
    print(f"⏱️  Completed: {datetime.now().strftime('%H:%M:%S')} ({duration:.1f}s)")
    
    if proc.returncode == 0:
        try:
            result = json.loads(proc.stdout)
            
            print("\n" + "=" * 70)
            print("✅ GENERATION SUCCESSFUL")
            print("=" * 70)
            
            # Core results
            print(f"\n📊 Core Results:")
            print(f"  Success: {result.get('success')}")
            print(f"  Job ID: {result.get('job_id')}")
            print(f"  Duration: {result.get('duration_seconds', 0):.1f}s")
            print(f"  Slug: {result.get('slug', 'N/A')}")
            
            # Content metrics
            headline = result.get('headline', 'N/A')
            print(f"\n📄 Content:")
            print(f"  Headline: {headline[:80]}{'...' if len(headline) > 80 else ''}")
            print(f"  Word Count: {result.get('word_count', 0)}")
            print(f"  Read Time: {result.get('read_time_minutes', 0)} min")
            print(f"  Language: {result.get('language', 'N/A')}")
            print(f"  Country: {result.get('country', 'N/A')}")
            
            # Quality score
            aeo_score = result.get('aeo_score')
            print(f"\n🎯 Quality:")
            print(f"  AEO Score: {aeo_score if aeo_score else 'N/A'}")
            if aeo_score and aeo_score < 85:
                print(f"  ⚠️  Below threshold (85) - Quality gate bypassed ✅")
            
            # HTML content (THE KEY TEST)
            html_content = result.get('html_content', '')
            print(f"\n📄 HTML Content:")
            print(f"  Length: {len(html_content)} chars")
            if html_content:
                print(f"  ✅ HTML GENERATED - Quality gate bypass WORKING!")
                print(f"  Preview: {html_content[:200]}...")
            else:
                print(f"  ❌ HTML EMPTY - Quality gate still blocking!")
            
            # Enhanced data
            print(f"\n🔍 Enhanced Data:")
            print(f"  Citations: {result.get('citations_count', 0)}")
            print(f"  Internal Links: {result.get('internal_links_count', 0)}")
            print(f"  FAQ Items: {result.get('faq_count', 0)}")
            print(f"  PAA Items: {result.get('paa_count', 0)}")
            print(f"  Table of Contents: {len(result.get('toc', {})) if result.get('toc') else 0} entries")
            
            # Meta tags
            meta_title = result.get('meta_title', '')
            meta_desc = result.get('meta_description', '')
            print(f"\n🏷️  Meta Tags:")
            print(f"  Title: {meta_title[:60]}{'...' if len(meta_title) > 60 else ''}")
            print(f"  Description: {meta_desc[:80]}{'...' if len(meta_desc) > 80 else ''}")
            
            # Images
            print(f"\n🖼️  Images:")
            print(f"  Featured: {'✅' if result.get('image_url') else '❌'}")
            print(f"  Alt Text: {result.get('image_alt_text', 'N/A')[:60]}")
            
            # Metadata
            print(f"\n📅 Metadata:")
            print(f"  Publication Date: {result.get('publication_date', 'N/A')}")
            
            # Final verdict
            print("\n" + "=" * 70)
            if html_content and len(html_content) > 100:
                print("✅ TEST PASSED - QUALITY GATE BYPASS CONFIRMED")
                print("   HTML content generated despite potential low AEO score")
                print("   Integration is working correctly")
            elif not html_content:
                print("❌ TEST FAILED - HTML still empty")
                print("   Quality gate may still be blocking")
            else:
                print("⚠️  TEST INCONCLUSIVE - HTML too short")
            print("=" * 70)
            
            # Save results
            output_file = Path(__file__).parent / 'test_single_blog_output.json'
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\n💾 Full output saved to: {output_file}")
            
        except json.JSONDecodeError as e:
            print(f"\n❌ Failed to parse JSON output: {e}")
            print(f"\nstdout (first 1000 chars): {proc.stdout[:1000]}")
            sys.exit(1)
    else:
        print(f"\n❌ Generation failed (exit code {proc.returncode})")
        print(f"\nstderr: {proc.stderr[:2000]}")
        sys.exit(1)
        
except subprocess.TimeoutExpired:
    duration = (datetime.now() - start_time).total_seconds()
    print(f"\n⏱️  Generation timed out after {duration:.1f}s")
    print("  This may indicate API slowness or a blocking issue")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

