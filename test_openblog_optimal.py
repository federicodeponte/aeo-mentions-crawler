#!/usr/bin/env python3
"""Test blog generation with openblog's optimal parameters"""

import os
import sys
import json
import subprocess
import time
from datetime import datetime

# Set environment
os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

print("=" * 80)
print("🚀 BLOG GENERATION TEST - OPENBLOG OPTIMAL SETTINGS")
print("=" * 80)
print()
print("📝 Config: AEO (openblog default: ~2000 words)")
print()

# Test configuration - use openblog's expected format
test_config = {
    "primary_keyword": "AEO optimization guide",
    "company": "Test Company",
    "company_url": "https://test.com",
    "target_market": "US",
    "language": "en",
    # Remove word_count to let openblog use its default (2000 words)
    "enable_image_generation": True,  # Test full pipeline
    "context": ""
}

start_time = time.time()

# Run blog generation
try:
    print("🎬 Starting blog generation (openblog optimal settings)...")
    
    result = subprocess.run([
        sys.executable, "scripts/generate-blog.py"
    ], 
    input=json.dumps(test_config),
    text=True,
    capture_output=True,
    timeout=900  # 15 minutes for full pipeline with images
    )
    
    elapsed = time.time() - start_time
    print(f"⏱️  Total time: {elapsed:.1f}s")
    
    if result.returncode == 0:
        print("✅ Process completed successfully!")
        try:
            output = json.loads(result.stdout)
            print(f"🎯 Success: {output.get('success')}")
            print(f"📰 Headline: {output.get('headline', 'N/A')}")
            print(f"📄 HTML Length: {len(output.get('html_content', ''))} chars")
            print(f"📊 Word Count: {output.get('word_count', 0)}")
            print(f"⏱️  Duration: {output.get('duration_seconds', 0):.1f}s")
            
            # Save output
            with open('test_openblog_optimal_output.json', 'w') as f:
                json.dump(output, f, indent=2)
            print("💾 Saved to test_openblog_optimal_output.json")
            
            # Check if we got proper content length
            word_count = output.get('word_count', 0)
            if word_count >= 1500:
                print(f"✅ Word count meets openblog standards: {word_count} words")
            else:
                print(f"⚠️  Word count below openblog target: {word_count} words (expected: 1800-2200)")
            
        except json.JSONDecodeError as e:
            print(f"❌ Parse failed: {e}")
            print("Raw output (first 500 chars):")
            print(result.stdout[:500])
    else:
        print(f"❌ Process failed with return code: {result.returncode}")
        print("STDOUT:", result.stdout[:500])
        print("STDERR:", result.stderr[:500])
        
except subprocess.TimeoutExpired:
    print("❌ Process timed out after 15 minutes")
except Exception as e:
    print(f"❌ Error: {e}")

print()
print("=" * 80)