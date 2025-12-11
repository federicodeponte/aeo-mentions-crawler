#!/usr/bin/env python3
"""
Test single-phase company analysis with Gemini 3 Pro
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Load env vars
from run_local import load_env
load_env()

from company_service import CompanyAnalysisRequest, _analyze_internal, get_domain
import json

async def test_single_company():
    print("\n" + "="*80)
    print("🧪 Testing Single-Phase Company Analysis with Gemini 3 Pro")
    print("="*80)
    
    # Test with 8fit
    request = CompanyAnalysisRequest(
        website_url="https://8fit.com",
        company_name="8fit",
        extract_logo=True
    )
    
    domain = get_domain(request.website_url)
    
    print(f"\n📋 Testing: {request.company_name}")
    print(f"   URL: {request.website_url}")
    print(f"   Domain: {domain}")
    print(f"   Extract logo: {request.extract_logo}")
    
    try:
        print(f"\n⚡ Starting analysis...")
        result = await _analyze_internal(request, domain)
        
        print(f"\n✅ Analysis complete!")
        
        # Display key results
        company_info = result.get("company_info", {})
        print(f"\n📊 RESULTS:")
        print(f"   Description: {company_info.get('description', 'N/A')[:100]}...")
        print(f"   Industry: {company_info.get('industry', 'N/A')}")
        print(f"   Products: {len(company_info.get('products', []))} items")
        print(f"   Services: {len(company_info.get('services', []))} items")
        print(f"   Pain points: {len(company_info.get('pain_points', []))} items")
        print(f"   Customer problems: {len(company_info.get('customer_problems', []))} items")
        print(f"   Differentiators: {len(company_info.get('differentiators', []))} items")
        
        print(f"\n   Competitors: {len(result.get('competitors', []))}")
        print(f"   Insights: {len(result.get('insights', []))}")
        print(f"   Brand voice: {'✅' if result.get('brand_voice') else '❌'}")
        print(f"   Tone: {'✅' if result.get('tone') else '❌'}")
        
        brand_assets = result.get("brand_assets", {})
        print(f"\n   Brand colors: {len(brand_assets.get('colors', []))}")
        print(f"   Brand fonts: {len(brand_assets.get('fonts', []))}")
        print(f"   Logo: {'✅' if brand_assets.get('logo') else '❌'}")
        
        tech = result.get("website_tech", {})
        if tech:
            print(f"\n   CMS: {tech.get('cms', 'N/A')}")
            print(f"   Frameworks: {tech.get('frameworks', [])}")
        
        # Save full result
        output_file = "test_single_phase_result.json"
        with open(output_file, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Full result saved to: {output_file}")
        
        # Check for missing critical fields
        print(f"\n🔍 FIELD VALIDATION:")
        critical_fields = [
            ('pain_points', company_info.get('pain_points')),
            ('customer_problems', company_info.get('customer_problems')),
            ('differentiators', company_info.get('differentiators')),
            ('solution_keywords', company_info.get('solution_keywords')),
            ('brand_voice', result.get('brand_voice')),
            ('tone', result.get('tone'))
        ]
        
        missing = []
        for field_name, value in critical_fields:
            if not value or (isinstance(value, list) and len(value) == 0):
                missing.append(field_name)
                print(f"   ⚠️  {field_name}: MISSING")
            else:
                count = len(value) if isinstance(value, list) else len(str(value))
                print(f"   ✅ {field_name}: {count} {'items' if isinstance(value, list) else 'chars'}")
        
        if missing:
            print(f"\n⚠️  Warning: {len(missing)} fields missing or empty")
        else:
            print(f"\n🎉 All critical fields populated!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_single_company())

