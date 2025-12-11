#!/usr/bin/env python3
"""
Test full company analysis locally using the new openpull implementation
"""
import requests
import json
import time

def test_company_analysis(company_name, website_url):
    """Test company analysis endpoint."""
    
    print(f"\n{'='*80}")
    print(f"🧪 Testing Company Analysis: {company_name}")
    print(f"   Website: {website_url}")
    print(f"{'='*80}\n")
    
    # Prepare request
    url = "http://localhost:8000/company/analyze"
    payload = {
        "website_url": website_url,
        "company_name": company_name,
        "extract_logo": True,
        "mode": "fast"  # Use fast mode for testing (Gemini 2.0 Flash)
    }
    
    print(f"📤 Sending request to {url}")
    print(f"   Mode: fast (Gemini 2.0 Flash)")
    print(f"   Extract logo: True\n")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            url,
            json=payload,
            timeout=300  # 5 minute timeout
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"✅ Analysis completed in {elapsed:.1f}s\n")
            
            # Company Info
            company_info = result.get('company_info', {})
            if company_info:
                print("📋 COMPANY INFO:")
                print(f"   Description: {company_info.get('description', 'N/A')[:200]}...")
                print(f"   Industry: {company_info.get('industry', 'N/A')}")
                print(f"   Products: {len(company_info.get('products', []))} items")
                print(f"   Services: {len(company_info.get('services', []))} items")
                print(f"   Target Audience: {company_info.get('target_audience', [])}")
                if company_info.get('products'):
                    print(f"   First 3 Products: {company_info['products'][:3]}")
                if company_info.get('services'):
                    print(f"   First 3 Services: {company_info['services'][:3]}")
            
            # Brand Assets
            brand_assets = result.get('brand_assets', {})
            if brand_assets:
                print(f"\n🎨 BRAND ASSETS:")
                print(f"   Logo URL: {brand_assets.get('logo_url', 'N/A')}")
                colors = brand_assets.get('colors', {})
                if colors:
                    print(f"   Primary Color: {colors.get('primary', 'N/A')}")
                    print(f"   All Colors: {list(colors.values())[:5]}")
                fonts = brand_assets.get('fonts', [])
                if fonts:
                    print(f"   Fonts: {fonts[:3]}")
            
            # Website Tech
            tech = result.get('website_tech', {})
            if tech:
                print(f"\n💻 WEBSITE TECH:")
                print(f"   CMS: {tech.get('cms', 'N/A')}")
                print(f"   Frameworks: {tech.get('frameworks', [])[:3]}")
                print(f"   Technologies: {len(tech.get('technologies', []))} detected")
            
            # Legal Info
            legal = result.get('legal_info', {})
            if legal:
                print(f"\n⚖️  LEGAL INFO:")
                print(f"   Legal Name: {legal.get('legal_name', 'N/A')}")
                print(f"   Location: {legal.get('headquarters', {}).get('country', 'N/A')}")
            
            # Competitors
            competitors = result.get('competitors', [])
            if competitors:
                print(f"\n🏢 COMPETITORS: {len(competitors)} found")
                for comp in competitors[:3]:
                    print(f"   - {comp.get('name', 'N/A')}: {comp.get('reason', 'N/A')[:80]}")
            
            # Insights
            insights = result.get('insights', [])
            if insights:
                print(f"\n💡 INSIGHTS: {len(insights)} generated")
                for insight in insights[:3]:
                    print(f"   - {insight[:100]}...")
            
            # Save full result
            output_file = f"test_analysis_{company_name.lower().replace(' ', '_')}.json"
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\n💾 Full results saved to: {output_file}")
            
            return True
            
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            return False
            
    except requests.Timeout:
        elapsed = time.time() - start_time
        print(f"⏱️  Request timed out after {elapsed:.1f}s")
        return False
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Error after {elapsed:.1f}s: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # Test with 3 different companies
    test_cases = [
        ("8fit", "https://8fit.com"),
        ("Mitzu", "https://mitzu.io"),
        ("Yokoy", "https://www.yokoy.io"),
    ]
    
    print("\n" + "="*80)
    print("🚀 COMPANY ANALYSIS - FULL PIPELINE TEST")
    print("   Using local openpull implementation")
    print("   Mode: Fast (Gemini 2.0 Flash)")
    print("="*80)
    
    results = []
    for company_name, website_url in test_cases:
        success = test_company_analysis(company_name, website_url)
        results.append((company_name, success))
        print()
    
    # Summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    successful = sum(1 for _, success in results if success)
    total = len(results)
    print(f"   Success: {successful}/{total}")
    for company_name, success in results:
        status = "✅" if success else "❌"
        print(f"   {status} {company_name}")
    print("="*80)

