#!/usr/bin/env python3
"""
Isolated debugging - test each component separately
"""

import sys
import os
from pathlib import Path
import asyncio

# Load env
env_path = Path('.env.local')
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

print("=" * 60)
print("ISOLATED DEBUG TEST")
print("=" * 60)

# Test 1: Direct Gemini API call (bypass openblog)
print("\n1️⃣ Testing direct Gemini API call...")
try:
    import google.generativeai as genai
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not set")
        sys.exit(1)
    
    print(f"   API Key: {api_key[:20]}...{api_key[-10:]}")
    
    genai.configure(api_key=api_key)
    
    # Try simple generation
    print("   Testing gemini-2.0-flash-exp...")
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    response = model.generate_content("Say 'Hello' in 3 words")
    print(f"   ✅ Response: {response.text[:50]}")
    
except Exception as e:
    print(f"   ❌ Failed: {e}")
    import traceback
    traceback.print_exc()

# Test 2: Import openblog components
print("\n2️⃣ Testing openblog imports...")
try:
    blog_writer_path = Path('python-services/blog-writer')
    sys.path.insert(0, str(blog_writer_path))
    
    print("   Importing WorkflowEngine...")
    from pipeline.core.workflow_engine import WorkflowEngine
    print("   ✅ WorkflowEngine imported")
    
    print("   Importing ExecutionContext...")
    from pipeline.core.execution_context import ExecutionContext
    print("   ✅ ExecutionContext imported")
    
    print("   Importing Stage 0...")
    from pipeline.blog_generation.stage_00_data_fetch import DataFetchStage
    print("   ✅ Stage 0 imported")
    
    print("   Importing Stage 2 (Gemini)...")
    from pipeline.blog_generation.stage_02_gemini_call import GeminiCallStage
    print("   ✅ Stage 2 imported")
    
except Exception as e:
    print(f"   ❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Initialize stages individually
print("\n3️⃣ Testing stage initialization...")
try:
    print("   Initializing Stage 0 (DataFetch)...")
    stage0 = DataFetchStage()
    print("   ✅ Stage 0 initialized")
    
    print("   Initializing Stage 2 (GeminiCall)...")
    stage2 = GeminiCallStage()
    print("   ✅ Stage 2 initialized")
    
except Exception as e:
    print(f"   ❌ Stage init failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Check for Playwright browser downloads
print("\n4️⃣ Checking for blocking operations...")
try:
    print("   Checking Playwright...")
    import playwright
    print("   ✅ Playwright imported (might trigger browser download on first use)")
    
    # Check if browsers are installed
    from playwright.sync_api import sync_playwright
    print("   ⚠️  Note: Playwright might download browsers (500MB+) on first run")
    
except ImportError:
    print("   ✅ Playwright not imported (good - no blocking downloads)")
except Exception as e:
    print(f"   ⚠️  Playwright check: {e}")

# Test 5: Minimal workflow execution (Stage 0 only)
print("\n5️⃣ Testing minimal workflow (Stage 0 only)...")
try:
    engine = WorkflowEngine()
    engine.register_stages([stage0])
    
    job_config = {
        "primary_keyword": "test",
        "company_url": "https://scaile.tech",
        "language": "en",
        "country": "US",
    }
    
    print("   Executing Stage 0 only...")
    
    async def test_stage0():
        context = await engine.execute(
            job_id="test-001",
            job_config=job_config
        )
        return context
    
    context = asyncio.run(test_stage0())
    print(f"   ✅ Stage 0 completed")
    print(f"      Company data keys: {list(context.company_data.keys())[:5]}")
    
except Exception as e:
    print(f"   ❌ Stage 0 execution failed: {e}")
    import traceback
    traceback.print_exc()

# Test 6: Test Stage 2 with minimal prompt
print("\n6️⃣ Testing Stage 2 (Gemini) with minimal data...")
try:
    # Create minimal context
    context = ExecutionContext(
        job_id="test-002",
        job_config={
            "primary_keyword": "test keyword",
            "word_count": 100,
            "tone": "professional",
        },
        prompt="Write exactly 3 words about AI."
    )
    
    print("   Executing Stage 2 with minimal prompt...")
    print("   ⏱️  Starting Gemini call (30s timeout)...")
    
    async def test_stage2():
        result = await asyncio.wait_for(
            stage2.execute(context),
            timeout=30.0
        )
        return result
    
    result_context = asyncio.run(test_stage2())
    
    if result_context.raw_article:
        print(f"   ✅ Stage 2 completed!")
        print(f"      Response length: {len(result_context.raw_article)} chars")
        print(f"      First 100 chars: {result_context.raw_article[:100]}")
    else:
        print("   ❌ Stage 2 returned empty response")
    
except asyncio.TimeoutError:
    print("   ❌ Stage 2 timed out after 30s")
    print("   🔍 This is the actual issue - Stage 2 is hanging")
except Exception as e:
    print(f"   ❌ Stage 2 failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("DEBUG COMPLETE")
print("=" * 60)

