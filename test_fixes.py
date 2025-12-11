#!/usr/bin/env python3
"""Test the fixes for 3000-word minimum and circuit breaker"""

import os
import sys
import json
import subprocess
import time
from datetime import datetime

# Set environment
os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

print("=" * 80)
print("🔧 TESTING OPENBLOG FIXES")
print("=" * 80)
print()
print("✅ Fixed: Removed 3000-word minimum (now 500-word minimum)")
print("✅ Fixed: Increased circuit breaker tolerance (5→15 failures)")
print("✅ Fixed: Added 2-second stagger for parallel requests")
print()

# Test single blog first
print("🧪 TEST 1: Single Blog Generation")
print("=" * 50)

single_config = {
    "primary_keyword": "AEO testing guide",
    "company": "Test Company", 
    "company_url": "https://test.com",
    "target_market": "US",
    "language": "en",
    "enable_image_generation": False,  # Faster testing
    "context": ""
}

start_time = time.time()

try:
    print("🎬 Starting single blog test...")
    
    result = subprocess.run([
        sys.executable, "scripts/generate-blog.py"
    ], 
    input=json.dumps(single_config),
    text=True,
    capture_output=True,
    timeout=600  # 10 minutes
    )
    
    elapsed = time.time() - start_time
    print(f"⏱️  Single blog time: {elapsed:.1f}s")
    
    if result.returncode == 0:
        print("✅ Single blog SUCCESS!")
        try:
            output = json.loads(result.stdout)
            success = output.get('success', False)
            headline = output.get('headline', 'N/A')[:50] + "..."
            word_count = output.get('word_count', 0)
            print(f"   🎯 Success: {success}")
            print(f"   📰 Headline: {headline}")
            print(f"   📊 Word Count: {word_count}")
            
            if success and word_count > 500:
                print(f"   ✅ PASSED: Content generated and meets minimum word count")
            else:
                print(f"   ⚠️  WARNING: Success={success}, Words={word_count}")
                
        except json.JSONDecodeError as e:
            print(f"   ❌ Parse failed: {e}")
    else:
        print(f"❌ Single blog FAILED with return code: {result.returncode}")
        print("Error:", result.stderr[:200] if result.stderr else result.stdout[:200])

except subprocess.TimeoutExpired:
    print("❌ Single blog timed out after 10 minutes")
except Exception as e:
    print(f"❌ Single blog error: {e}")

print()
print("🧪 TEST 2: Small Batch Generation (2 blogs)")
print("=" * 50)

# Test small batch
batch_config = {
    "primary_keyword": "AEO batch test",
    "batch_mode": True,
    "company": "Test Company",
    "company_url": "https://test.com", 
    "target_market": "US",
    "language": "en",
    "enable_image_generation": False,  # Faster testing
    "batch_keywords": [
        {"keyword": "AEO batch test 1", "word_count": None},
        {"keyword": "AEO batch test 2", "word_count": None}
    ]
}

start_time = time.time()

try:
    print("🎬 Starting small batch test...")
    
    result = subprocess.run([
        sys.executable, "scripts/generate-blog.py"
    ], 
    input=json.dumps(batch_config),
    text=True,
    capture_output=True,
    timeout=900  # 15 minutes for 2 blogs
    )
    
    elapsed = time.time() - start_time
    print(f"⏱️  Batch time: {elapsed:.1f}s")
    
    if result.returncode == 0:
        print("✅ Batch SUCCESS!")
        try:
            output = json.loads(result.stdout)
            
            if isinstance(output, dict) and 'results' in output:
                results = output['results']
                print(f"   📊 Generated {len(results)} blogs:")
                
                success_count = 0
                for i, blog in enumerate(results, 1):
                    success = blog.get('success', False)
                    keyword = blog.get('keyword', 'N/A')
                    word_count = blog.get('word_count', 0)
                    error = blog.get('error', '')
                    status = "✅" if success else "❌"
                    
                    print(f"     {i}. {status} {keyword} ({word_count} words)")
                    if not success and error:
                        print(f"        Error: {error[:100]}...")
                    
                    if success:
                        success_count += 1
                
                print(f"   📈 Success rate: {success_count}/{len(results)} ({success_count/len(results)*100:.0f}%)")
                
                if success_count == len(results):
                    print(f"   🎉 ALL BLOGS GENERATED SUCCESSFULLY!")
                elif success_count > 0:
                    print(f"   ⚠️  PARTIAL SUCCESS - {success_count} out of {len(results)} succeeded")
                else:
                    print(f"   ❌ ALL BLOGS FAILED")
            else:
                print(f"   ⚠️  Unexpected output format: {output}")
                
        except json.JSONDecodeError as e:
            print(f"   ❌ Parse failed: {e}")
    else:
        print(f"❌ Batch FAILED with return code: {result.returncode}")
        print("Error:", result.stderr[:200] if result.stderr else result.stdout[:200])

except subprocess.TimeoutExpired:
    print("❌ Batch timed out after 15 minutes")
except Exception as e:
    print(f"❌ Batch error: {e}")

print()
print("=" * 80)
print("🔬 TEST SUMMARY")
print("=" * 80)
print("If both tests passed, the fixes are working!")
print("Next: Try larger batches or enable image generation")
print("=" * 80)