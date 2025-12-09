#!/usr/bin/env python3
"""
Batch Blog Generation Test - Quality Gate Bypass Verification
Tests multiple blogs with different configs
"""

import sys
import os
import json
import subprocess
from pathlib import Path
from datetime import datetime
import time

# Set API key
os.environ['GEMINI_API_KEY'] = '***REMOVED***'

print("=" * 70)
print("BATCH BLOG GENERATION TEST - Quality Gate Bypass")
print("=" * 70)

# Test batch - 3 diverse blogs
test_batch = [
    {
        "name": "Short AEO Blog",
        "config": {
            "primary_keyword": "What is AEO optimization",
            "company_url": "https://scaile.tech",
            "language": "en",
            "country": "US",
            "word_count": 500,
            "tone": "professional",
            "company_context": {
                "company_name": "SCAILE",
                "industry": "AEO Services",
                "products": ["AI Visibility Engine"]
            }
        }
    },
    {
        "name": "Medium Marketing Blog",
        "config": {
            "primary_keyword": "AI search engine optimization best practices",
            "company_url": "https://example.com",
            "language": "en",
            "country": "US",
            "word_count": 800,
            "tone": "conversational",
            "company_context": {
                "company_name": "Example Corp",
                "industry": "Digital Marketing",
                "products": ["Marketing Platform", "Analytics Suite"]
            }
        }
    },
    {
        "name": "Long Technical Blog",
        "config": {
            "primary_keyword": "How to integrate answer engine optimization in enterprise",
            "company_url": "https://techcorp.io",
            "language": "en",
            "country": "US",
            "word_count": 1200,
            "tone": "technical",
            "company_context": {
                "company_name": "TechCorp",
                "industry": "Enterprise Software",
                "products": ["API Platform", "Developer Tools", "Integration Hub"]
            }
        }
    }
]

print(f"\n📝 Batch Configuration:")
print(f"  Total Blogs: {len(test_batch)}")
for i, item in enumerate(test_batch, 1):
    print(f"  {i}. {item['name']}: {item['config']['word_count']} words")

print(f"\n⏱️  Starting batch: {datetime.now().strftime('%H:%M:%S')}")
print(f"  Expected duration: 12-21 minutes (4-7 min per blog)")
print("-" * 70)

batch_start = datetime.now()
script_path = Path(__file__).parent / 'scripts' / 'generate-blog.py'
results = []

for i, item in enumerate(test_batch, 1):
    blog_name = item['name']
    config = item['config']
    
    print(f"\n[{i}/{len(test_batch)}] Generating: {blog_name}")
    print(f"  Keyword: {config['primary_keyword'][:60]}...")
    print(f"  Word Count: {config['word_count']}")
    
    item_start = datetime.now()
    
    try:
        proc = subprocess.run(
            ['python3', str(script_path)],
            input=json.dumps(config),
            capture_output=True,
            text=True,
            timeout=600  # 10 minutes per blog
        )
        
        duration = (datetime.now() - item_start).total_seconds()
        
        if proc.returncode == 0:
            try:
                result = json.loads(proc.stdout)
                
                # Quick summary
                html_len = len(result.get('html_content', ''))
                aeo_score = result.get('aeo_score')
                
                print(f"  ✅ Success ({duration:.1f}s)")
                print(f"     HTML: {html_len} chars")
                print(f"     AEO: {aeo_score if aeo_score else 'N/A'}")
                print(f"     Word Count: {result.get('word_count', 0)}")
                print(f"     Citations: {result.get('citations_count', 0)}")
                print(f"     FAQ: {result.get('faq_count', 0)}")
                
                results.append({
                    "name": blog_name,
                    "success": True,
                    "duration": duration,
                    "html_length": html_len,
                    "aeo_score": aeo_score,
                    "word_count": result.get('word_count', 0),
                    "citations_count": result.get('citations_count', 0),
                    "faq_count": result.get('faq_count', 0),
                    "full_result": result
                })
                
            except json.JSONDecodeError as e:
                print(f"  ❌ JSON parse error: {e}")
                results.append({
                    "name": blog_name,
                    "success": False,
                    "error": f"JSON parse error: {e}"
                })
        else:
            print(f"  ❌ Failed (exit code {proc.returncode})")
            stderr_preview = proc.stderr[:500] if proc.stderr else "No stderr"
            print(f"     Error: {stderr_preview}")
            results.append({
                "name": blog_name,
                "success": False,
                "error": f"Exit code {proc.returncode}: {stderr_preview}"
            })
    
    except subprocess.TimeoutExpired:
        duration = (datetime.now() - item_start).total_seconds()
        print(f"  ⏱️  Timed out after {duration:.1f}s")
        results.append({
            "name": blog_name,
            "success": False,
            "error": f"Timeout after {duration:.1f}s"
        })
    
    except Exception as e:
        print(f"  ❌ Unexpected error: {e}")
        results.append({
            "name": blog_name,
            "success": False,
            "error": str(e)
        })
    
    # Small delay between blogs
    if i < len(test_batch):
        print("  Waiting 5s before next blog...")
        time.sleep(5)

batch_duration = (datetime.now() - batch_start).total_seconds()

# Batch summary
print("\n" + "=" * 70)
print("BATCH GENERATION SUMMARY")
print("=" * 70)

print(f"\n⏱️  Total Duration: {batch_duration:.1f}s ({batch_duration/60:.1f} min)")

successful = [r for r in results if r.get('success')]
failed = [r for r in results if not r.get('success')]

print(f"\n📊 Results:")
print(f"  Total: {len(results)}")
print(f"  ✅ Successful: {len(successful)}")
print(f"  ❌ Failed: {len(failed)}")

if successful:
    print(f"\n✅ Successful Blogs:")
    for i, r in enumerate(successful, 1):
        html_len = r.get('html_length', 0)
        aeo = r.get('aeo_score', 'N/A')
        duration = r.get('duration', 0)
        print(f"  {i}. {r['name']}")
        print(f"     Duration: {duration:.1f}s")
        print(f"     HTML: {html_len} chars {'✅' if html_len > 100 else '❌'}")
        print(f"     AEO Score: {aeo}")
        print(f"     Word Count: {r.get('word_count', 0)}")
        print(f"     Enhanced Data: {r.get('citations_count', 0)} citations, {r.get('faq_count', 0)} FAQs")

if failed:
    print(f"\n❌ Failed Blogs:")
    for i, r in enumerate(failed, 1):
        print(f"  {i}. {r['name']}: {r.get('error', 'Unknown error')[:100]}")

# Quality gate bypass verification
print(f"\n🔍 Quality Gate Bypass Verification:")
html_generated_count = sum(1 for r in successful if r.get('html_length', 0) > 100)
low_aeo_with_html = sum(1 for r in successful if r.get('aeo_score') and r['aeo_score'] < 85 and r.get('html_length', 0) > 100)

print(f"  Blogs with HTML: {html_generated_count}/{len(successful)}")
print(f"  Low AEO (<85) with HTML: {low_aeo_with_html}")

print("\n" + "=" * 70)
if len(successful) == len(test_batch) and html_generated_count == len(successful):
    print("✅ BATCH TEST PASSED")
    print("   All blogs generated with HTML content")
    print("   Quality gate bypass confirmed")
elif len(successful) > 0 and html_generated_count > 0:
    print("⚠️  BATCH TEST PARTIAL SUCCESS")
    print(f"   {html_generated_count}/{len(successful)} blogs have HTML")
else:
    print("❌ BATCH TEST FAILED")
    print("   No blogs generated with HTML content")
print("=" * 70)

# Save batch results
output_file = Path(__file__).parent / 'test_batch_blog_output.json'
with open(output_file, 'w') as f:
    json.dump(results, f, indent=2)
print(f"\n💾 Batch results saved to: {output_file}")

# Exit code
sys.exit(0 if len(successful) == len(test_batch) else 1)

