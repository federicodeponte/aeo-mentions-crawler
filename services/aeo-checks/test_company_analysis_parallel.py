#!/usr/bin/env python3
"""Test company analysis for 5 companies in parallel."""
import asyncio
import os
import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

from company_service import _analyze_internal_gemini_native, CompanyAnalysisRequest, get_domain

# Test companies - mix of well-known and smaller companies
TEST_COMPANIES = [
    {"name": "Stripe", "url": "https://stripe.com"},
    {"name": "Notion", "url": "https://www.notion.so"},
    {"name": "Linear", "url": "https://linear.app"},
    {"name": "Vercel", "url": "https://vercel.com"},
    {"name": "Figma", "url": "https://www.figma.com"},
]

async def analyze_company(company: dict):
    """Analyze a single company."""
    start_time = time.time()
    print(f"🚀 Starting analysis for {company['name']} ({company['url']})...")
    
    try:
        request = CompanyAnalysisRequest(
            company_name=company['name'],
            website_url=company['url'],
            extract_logo=True,
        )
        
        domain = get_domain(company['url'])
        result = await _analyze_internal_gemini_native(request, domain)
        
        elapsed = time.time() - start_time
        
        # Extract key info
        company_info = result.get('company_info', {}) or {}
        brand_assets = result.get('brand_assets', {}) or {}
        website_tech = result.get('website_tech') or {}
        
        print(f"✅ {company['name']} completed in {elapsed:.1f}s")
        print(f"   Industry: {company_info.get('industry', 'N/A') if company_info else 'N/A'}")
        print(f"   Colors: {len(brand_assets.get('colors', [])) if brand_assets else 0}")
        print(f"   Fonts: {len(brand_assets.get('fonts', [])) if brand_assets else 0}")
        print(f"   CMS: {website_tech.get('cms', 'N/A') if website_tech else 'N/A'}")
        print(f"   Logo: {'✅' if brand_assets and brand_assets.get('logo') else '❌'}")
        print()
        
        return {"success": True, "company": company['name'], "elapsed": elapsed}
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ {company['name']} failed after {elapsed:.1f}s: {e}")
        print()
        return {"success": False, "company": company['name'], "error": str(e), "elapsed": elapsed}

async def main():
    """Run analysis for 5 companies in parallel."""
    print("=" * 60)
    print("🧪 Testing Company Analysis - 5 Companies in Parallel")
    print("=" * 60)
    print()
    
    start_time = time.time()
    
    # Run all 5 in parallel
    results = await asyncio.gather(*[analyze_company(company) for company in TEST_COMPANIES])
    
    total_elapsed = time.time() - start_time
    
    # Summary
    print("=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    print(f"✅ Successful: {len(successful)}/{len(results)}")
    print(f"❌ Failed: {len(failed)}/{len(results)}")
    print(f"⏱️  Total time: {total_elapsed:.1f}s")
    print(f"⚡ Average per company: {total_elapsed/len(results):.1f}s")
    print()
    
    if successful:
        avg_success_time = sum(r['elapsed'] for r in successful) / len(successful)
        print(f"📈 Average success time: {avg_success_time:.1f}s")
        print(f"🚀 Speedup vs sequential: {sum(r['elapsed'] for r in successful) / total_elapsed:.1f}x")
    
    if failed:
        print("\n❌ Failed companies:")
        for r in failed:
            print(f"   - {r['company']}: {r.get('error', 'Unknown error')}")

if __name__ == "__main__":
    asyncio.run(main())

