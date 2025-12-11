#!/usr/bin/env python3
"""Test full batch blog generation with multiple posts"""

import os
import sys
import json
import subprocess
import time
from datetime import datetime

# Set environment
os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

print("=" * 80)
print("🚀 FULL BATCH BLOG GENERATION TEST")
print("=" * 80)
print()
print("📝 Config: 5 blog posts with openblog optimal settings")
print()

# Batch configuration - multiple blog posts
test_config = {
    "primary_keyword": "AEO strategy 2025",  # Required even for batch mode
    "batch_mode": True,
    "company": "Test Company",
    "company_url": "https://test.com",
    "target_market": "US",
    "language": "en",
    "enable_image_generation": True,
    "batch_keywords": [
        {"keyword": "AEO strategy 2025", "word_count": None},
        {"keyword": "AI content optimization", "word_count": None},
        {"keyword": "Voice search SEO", "word_count": None},
        {"keyword": "ChatGPT optimization", "word_count": None},
        {"keyword": "Perplexity SEO guide", "word_count": None}
    ]
}

start_time = time.time()

# Run batch generation
try:
    print(f"🎬 Starting batch generation of {len(test_config['batch_keywords'])} blog posts...")
    print("Keywords:")
    for i, kw in enumerate(test_config['batch_keywords'], 1):
        print(f"  {i}. {kw['keyword']}")
    print()
    
    result = subprocess.run([
        sys.executable, "scripts/generate-blog.py"
    ], 
    input=json.dumps(test_config),
    text=True,
    capture_output=True,
    timeout=2700  # 45 minutes for 5 posts
    )
    
    elapsed = time.time() - start_time
    print(f"⏱️  Total batch time: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
    
    if result.returncode == 0:
        print("✅ Batch process completed successfully!")
        try:
            output = json.loads(result.stdout)
            
            if isinstance(output, list):
                # Multiple blog outputs
                print(f"📊 Generated {len(output)} blog posts:")
                for i, blog in enumerate(output, 1):
                    success = blog.get('success', False)
                    headline = blog.get('headline', 'N/A')[:60] + "..."
                    word_count = blog.get('word_count', 0)
                    duration = blog.get('duration_seconds', 0)
                    status = "✅" if success else "❌"
                    print(f"  {i}. {status} {headline} ({word_count} words, {duration:.1f}s)")
            else:
                # Single output
                print(f"🎯 Success: {output.get('success')}")
                print(f"📰 Headline: {output.get('headline', 'N/A')}")
                print(f"📊 Word Count: {output.get('word_count', 0)}")
            
            # Save output
            with open('test_full_batch_output.json', 'w') as f:
                json.dump(output, f, indent=2)
            print("💾 Saved to test_full_batch_output.json")
            
        except json.JSONDecodeError as e:
            print(f"❌ Parse failed: {e}")
            print("Raw output (first 500 chars):")
            print(result.stdout[:500])
    else:
        print(f"❌ Batch process failed with return code: {result.returncode}")
        print("STDOUT:", result.stdout[:500])
        print("STDERR:", result.stderr[:500])
        
except subprocess.TimeoutExpired:
    print("❌ Batch process timed out after 45 minutes")
except Exception as e:
    print(f"❌ Error: {e}")

print()
print("=" * 80)