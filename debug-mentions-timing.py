#!/usr/bin/env python3
"""
Heavy timing debug script for mentions check performance analysis
"""
import sys
import json
import os
import asyncio
import time
from datetime import datetime

# Add services directory to path
services_path = os.path.join(os.path.dirname(__file__), 'services/aeo-checks')
sys.path.insert(0, services_path)

class TimingLogger:
    def __init__(self):
        self.start_time = time.time()
        self.last_checkpoint = self.start_time
        
    def checkpoint(self, stage_name):
        current = time.time()
        stage_duration = current - self.last_checkpoint
        total_duration = current - self.start_time
        print(f"⏱️  [{total_duration:.1f}s total] {stage_name}: +{stage_duration:.1f}s", file=sys.stderr)
        self.last_checkpoint = current
        return stage_duration

async def debug_mentions_performance():
    timer = TimingLogger()
    
    print("🔍 PERFORMANCE DEBUG: AEO Mentions Check", file=sys.stderr)
    timer.checkpoint("Script started")
    
    # Import mentions service with timing
    try:
        from mentions_service import check_mentions, MentionsCheckRequest, CompanyAnalysis
        timer.checkpoint("Imports completed")
    except Exception as e:
        print(f"❌ Import failed: {e}", file=sys.stderr)
        return
    
    # Prepare minimal test data
    timer.checkpoint("Preparing test data")
    
    test_data = {
        "companyName": "SCAILE",
        "companyAnalysis": {
            "companyInfo": {
                "name": "SCAILE",
                "website": "https://scaile.tech",
                "description": "AI-powered EdTech platform for workforce development and education analytics",
                "industry": "EdTech",
                "productCategory": "SaaS",
                "products": ["AI Platform", "Learning Analytics"],
                "services": ["Consulting", "Implementation"],
                "pain_points": ["Skills gaps", "Education misalignment"]
            }
        },
        "companyWebsite": "https://scaile.tech",
        "mode": "fast",
        "numQueries": 1,  # Absolute minimum
        "language": "en",
        "country": "US"
    }
    
    timer.checkpoint("Test data prepared")
    
    # Convert to request object
    try:
        request = MentionsCheckRequest(**test_data)
        timer.checkpoint("Request object created")
    except Exception as e:
        print(f"❌ Request creation failed: {e}", file=sys.stderr)
        return
    
    print(f"📊 Test config: {request.numQueries} queries, mode: {request.mode}", file=sys.stderr)
    
    # Start mentions check with detailed timing
    print("\n🚀 Starting mentions check...", file=sys.stderr)
    check_start = time.time()
    
    try:
        # Monkey patch key functions to add timing
        original_generate_queries = None
        original_query_platform = None
        
        # Import the functions we want to time
        from mentions_service import generate_queries, query_platform_with_company
        
        # Wrap generate_queries with timing
        async def timed_generate_queries(*args, **kwargs):
            start = time.time()
            print(f"📝 Generating queries...", file=sys.stderr)
            result = await generate_queries(*args, **kwargs)
            duration = time.time() - start
            print(f"✅ Query generation: {duration:.1f}s, generated {len(result) if result else 0} queries", file=sys.stderr)
            if result:
                for i, q in enumerate(result):
                    print(f"   Query {i+1}: {q.get('query', 'N/A')}", file=sys.stderr)
            return result
        
        # Wrap query_platform_with_company with timing
        async def timed_query_platform(*args, **kwargs):
            start = time.time()
            platform = args[0] if args else "unknown"
            query = args[1] if len(args) > 1 else "unknown"
            print(f"🤖 Querying {platform}: '{query[:50]}...'", file=sys.stderr)
            result = await query_platform_with_company(*args, **kwargs)
            duration = time.time() - start
            print(f"✅ {platform} query completed: {duration:.1f}s", file=sys.stderr)
            return result
        
        # Temporarily replace functions
        import mentions_service
        mentions_service.generate_queries = timed_generate_queries
        mentions_service.query_platform_with_company = timed_query_platform
        
        timer.checkpoint("Instrumentation setup")
        
        # Run the actual mentions check
        result = await check_mentions(request)
        
        check_duration = time.time() - check_start
        timer.checkpoint(f"Mentions check completed ({check_duration:.1f}s)")
        
        # Analyze results
        print(f"\n📊 RESULTS ANALYSIS:", file=sys.stderr)
        print(f"   Visibility: {result.visibility}%", file=sys.stderr)
        print(f"   Queries processed: {len(result.queries) if result.queries else 0}", file=sys.stderr)
        print(f"   Platforms: {list(result.platforms.keys()) if result.platforms else []}", file=sys.stderr)
        
        # Performance breakdown
        print(f"\n⏱️  PERFORMANCE BREAKDOWN:", file=sys.stderr)
        print(f"   Total time: {check_duration:.1f}s", file=sys.stderr)
        print(f"   Time per query: {check_duration / max(1, len(result.queries)):.1f}s", file=sys.stderr)
        
        if check_duration > 60:
            print(f"🐌 SLOW: {check_duration:.1f}s for {request.numQueries} queries", file=sys.stderr)
            print(f"   Expected: ~15-30s for fast mode", file=sys.stderr)
            print(f"   Actual: {check_duration:.1f}s ({check_duration/60:.1f}x slower)", file=sys.stderr)
        elif check_duration > 30:
            print(f"⚠️  MODERATE: {check_duration:.1f}s", file=sys.stderr)
        else:
            print(f"✅ GOOD: {check_duration:.1f}s", file=sys.stderr)
        
        print(f"\n✅ SUCCESS: Mentions check completed", file=sys.stderr)
        return result
        
    except Exception as e:
        duration = time.time() - check_start
        timer.checkpoint(f"ERROR after {duration:.1f}s")
        print(f"❌ Mentions check failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None

# Also add deep timing to Gemini calls
async def debug_single_gemini_call():
    """Test a single Gemini call to measure base latency"""
    print(f"\n🧪 TESTING SINGLE GEMINI CALL LATENCY:", file=sys.stderr)
    
    try:
        from gemini_client import GeminiCompanyAnalysisClient
        
        client = GeminiCompanyAnalysisClient()
        print(f"✅ Gemini client initialized", file=sys.stderr)
        
        start = time.time()
        # Simple test query
        result = await client.query_with_search_grounding("test query about AI platforms")
        duration = time.time() - start
        
        print(f"✅ Single Gemini call: {duration:.1f}s", file=sys.stderr)
        print(f"   Response length: {len(result) if result else 0} chars", file=sys.stderr)
        
        if duration > 30:
            print(f"🐌 SLOW: Single call took {duration:.1f}s", file=sys.stderr)
            print(f"   This explains the overall slowness", file=sys.stderr)
        else:
            print(f"✅ Single call performance is reasonable", file=sys.stderr)
            
        return duration
        
    except Exception as e:
        print(f"❌ Single Gemini test failed: {e}", file=sys.stderr)
        return None

async def main():
    print(f"🚀 Starting performance debug at {datetime.now().strftime('%H:%M:%S')}", file=sys.stderr)
    
    # Test 1: Single Gemini call latency
    gemini_latency = await debug_single_gemini_call()
    
    # Test 2: Full mentions check
    result = await debug_mentions_performance()
    
    print(f"\n🏁 DEBUG COMPLETE at {datetime.now().strftime('%H:%M:%S')}", file=sys.stderr)
    
    # Summary analysis
    if gemini_latency and gemini_latency > 20:
        print(f"\n💡 BOTTLENECK IDENTIFIED: Gemini API calls", file=sys.stderr)
        print(f"   Single call: {gemini_latency:.1f}s", file=sys.stderr)
        print(f"   With web grounding, each call is very slow", file=sys.stderr)
        print(f"   Solution: Reduce queries or optimize web search", file=sys.stderr)
    
    if result:
        print(f"✅ Final result: {result.visibility}% visibility", file=sys.stderr)
        print(json.dumps({
            "success": True,
            "visibility": result.visibility,
            "performance_debug": "completed",
            "queries": result.queries
        }))
    else:
        print(json.dumps({"error": "Mentions check failed during debug"}))

if __name__ == "__main__":
    asyncio.run(main())