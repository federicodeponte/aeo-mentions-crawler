#!/usr/bin/env python3
"""
Test blog generation with latest openblog integration
Tests: enhanced data extraction, company context, full pipeline
"""

import sys
import json
import subprocess
from pathlib import Path
import os

# Load environment variables from .env.local
env_path = Path('.env.local')
env_vars = os.environ.copy()

if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()

print("=" * 60)
print("BLOG GENERATION TEST")
print("=" * 60)

# Test data with company context
test_input = {
    "primary_keyword": "AI-powered customer service automation",
    "word_count": 1200,
    "tone": "professional",
    "company_name": "SCAILE Technologies",
    "company_url": "https://scaile.tech",
    "language": "en",
    "country": "US",
    "batch_mode": False,
    "business_context": {
        "companyName": "SCAILE Technologies",
        "companyWebsite": "https://scaile.tech",
        "targetIndustries": "B2B SaaS, MarTech, AI Services",
        "productDescription": "AEO (Answer Engine Optimization) platform",
        "products": "AI Visibility Engine, Weekly AI Reports, Shadow Demand Discovery",
        "targetAudience": "B2B marketers, startup founders, marketing agencies",
        "competitors": "Traditional SEO agencies",
        "brandTone": "Professional, technical, authoritative",
        "painPoints": "Low visibility in AI search engines like ChatGPT and Perplexity",
        "valuePropositions": "Boost visibility in AI platforms, automated content generation, measurable ROI",
        "useCases": "AEO optimization, AI-powered content marketing, visibility tracking",
        "contentThemes": "Answer Engine Optimization, AI visibility, generative AI marketing"
    }
}

print("\n📝 Test Input:")
print(f"  Keyword: {test_input['primary_keyword']}")
print(f"  Company: {test_input['company_name']}")
print(f"  Word Count: {test_input['word_count']}")
print(f"  Tone: {test_input['tone']}")
print(f"  Has Context: {bool(test_input['business_context'])}")

print("\n🔄 Running blog generation...")
print("-" * 60)

# Run the generate-blog.py script
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
    
    stdout, stderr = process.communicate(input=json.dumps(test_input), timeout=300)  # 5 minutes
    
    if stderr:
        print("\n⚠️  Stderr output:")
        print(stderr)
    
    if process.returncode != 0:
        print(f"\n❌ Process failed with exit code {process.returncode}")
        print("\nStdout:")
        print(stdout)
        sys.exit(1)
    
    # Parse result
    result = json.loads(stdout)
    
    print("\n✅ Generation successful!")
    print("=" * 60)
    
    # Verify basic fields
    print("\n📊 Basic Fields:")
    print(f"  ✓ Job ID: {result.get('job_id', 'N/A')}")
    print(f"  ✓ Headline: {result.get('headline', 'N/A')[:60]}...")
    print(f"  ✓ Word Count: {result.get('word_count', 0)}")
    print(f"  ✓ Read Time: {result.get('read_time_minutes', 0)} min")
    print(f"  ✓ AEO Score: {result.get('aeo_score', 'N/A')}")
    print(f"  ✓ Duration: {result.get('duration_seconds', 0):.1f}s")
    
    # Verify enhanced data fields
    print("\n🔍 Enhanced Data Fields:")
    
    # Meta tags
    meta_title = result.get('meta_title', '')
    meta_description = result.get('meta_description', '')
    print(f"  {'✓' if meta_title else '✗'} Meta Title: {meta_title[:50] if meta_title else 'Missing'}...")
    print(f"  {'✓' if meta_description else '✗'} Meta Description: {meta_description[:50] if meta_description else 'Missing'}...")
    
    # Citations
    citations = result.get('citations', [])
    citations_count = result.get('citations_count', 0)
    print(f"  {'✓' if citations_count > 0 else '✗'} Citations: {citations_count}")
    if citations and len(citations) > 0:
        print(f"    → First citation: {citations[0].get('source', 'N/A')}")
        print(f"       URL: {citations[0].get('url', 'N/A')[:60]}...")
    
    # Internal links
    internal_links = result.get('internal_links', [])
    internal_links_count = result.get('internal_links_count', 0)
    print(f"  {'✓' if internal_links_count > 0 else '✗'} Internal Links: {internal_links_count}")
    if internal_links and len(internal_links) > 0:
        print(f"    → First link: {internal_links[0].get('anchor_text', 'N/A')}")
    
    # FAQ
    faq = result.get('faq', [])
    faq_count = result.get('faq_count', 0)
    print(f"  {'✓' if faq_count > 0 else '✗'} FAQ Items: {faq_count}")
    if faq and len(faq) > 0:
        print(f"    → First question: {faq[0].get('question', 'N/A')[:60]}...")
    
    # PAA
    paa = result.get('paa', [])
    paa_count = result.get('paa_count', 0)
    print(f"  {'✓' if paa_count > 0 else '✗'} PAA Items: {paa_count}")
    if paa and len(paa) > 0:
        print(f"    → First question: {paa[0].get('question', 'N/A')[:60]}...")
    
    # Image
    image_url = result.get('image_url', '')
    image_alt_text = result.get('image_alt_text', '')
    print(f"  {'✓' if image_url else '✗'} Image URL: {image_url[:50] if image_url else 'Missing'}...")
    if image_alt_text:
        print(f"    → Alt Text: {image_alt_text[:60]}...")
    
    # TOC
    toc = result.get('toc', {})
    print(f"  {'✓' if toc else '✗'} TOC: {len(toc)} sections")
    
    # Publication date
    pub_date = result.get('publication_date', '')
    print(f"  {'✓' if pub_date else '✗'} Publication Date: {pub_date or 'Missing'}")
    
    # Content
    html_content = result.get('html_content', '')
    print(f"\n📄 Content:")
    print(f"  HTML Length: {len(html_content)} chars")
    print(f"  Has Content: {'✓' if len(html_content) > 1000 else '✗'}")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    total_fields = 13  # Number of enhanced fields we're checking
    present_fields = sum([
        bool(meta_title),
        bool(meta_description),
        citations_count > 0,
        internal_links_count > 0,
        faq_count > 0,
        paa_count > 0,
        bool(image_url),
        bool(image_alt_text),
        bool(toc),
        bool(pub_date),
        bool(html_content),
        result.get('word_count', 0) > 0,
        result.get('aeo_score') is not None
    ])
    
    completeness = (present_fields / total_fields) * 100
    
    print(f"\n✅ Basic Generation: SUCCESS")
    print(f"✅ Enhanced Data: {present_fields}/{total_fields} fields present ({completeness:.0f}%)")
    print(f"✅ Company Context: Used (SCAILE Technologies)")
    
    if completeness >= 80:
        print(f"\n🎉 TEST PASSED - {completeness:.0f}% data completeness")
    elif completeness >= 50:
        print(f"\n⚠️  TEST PARTIAL - {completeness:.0f}% data completeness (some fields missing)")
    else:
        print(f"\n❌ TEST FAILED - {completeness:.0f}% data completeness (too many missing fields)")
    
    # Save full output for inspection
    output_file = Path('test_blog_output.json')
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\n💾 Full output saved to: {output_file}")
    
    sys.exit(0 if completeness >= 50 else 1)

except subprocess.TimeoutExpired:
    print("\n❌ Test timed out after 300 seconds (5 minutes)")
    process.kill()
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"\n❌ Failed to parse JSON output: {e}")
    print("\nRaw output:")
    print(stdout)
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

