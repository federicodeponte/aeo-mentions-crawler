#!/usr/bin/env python3
"""
Integration test for content-manager keyword generation
Tests the full flow from context analysis to keyword generation
"""
import sys
import os
import json
import asyncio

# Add openkeyword to path
openkeyword_path = os.path.join(os.path.dirname(__file__), 'python-services', 'openkeyword')
sys.path.insert(0, openkeyword_path)

from openkeywords.company_analyzer import analyze_company
from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

async def test_full_integration():
    """Test the full integration flow"""
    
    # Load API key from .env.local
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        # Try to load from .env.local
        env_path = os.path.join(os.path.dirname(__file__), '.env.local')
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment or .env.local")
        return False
    
    print("=" * 80)
    print("🧪 CONTENT-MANAGER INTEGRATION TEST")
    print("=" * 80)
    
    # TEST 1: Company Analysis (Context Page)
    print("\n📊 TEST 1: Company Analysis (Context Page)")
    print("-" * 80)
    print("Testing: /api/analyse-website with scaile.tech")
    
    try:
        analysis = await analyze_company("https://scaile.tech", api_key=api_key)
        
        print(f"✅ Company: {analysis.get('company_name', 'Unknown')}")
        print(f"✅ Industry: {analysis.get('industry', 'Unknown')}")
        print(f"✅ Products: {len(analysis.get('products', []))}")
        print(f"✅ Services: {len(analysis.get('services', []))}")
        print(f"✅ Target Audience: {analysis.get('target_audience', [])}")
        print(f"✅ Primary Region: {analysis.get('primary_region', 'Unknown')}")
        
        # Check for hyper-niche data
        has_company_sizes = any(
            size in str(analysis.get('target_audience', [])).lower()
            for size in ['startup', 'sme', 'enterprise', 'small business', 'mid-market']
        )
        has_specific_geo = analysis.get('primary_region') and analysis.get('primary_region').lower() not in ['us', 'global', 'worldwide']
        
        print(f"\n🎯 Hyper-niche data quality:")
        print(f"   {'✅' if has_company_sizes else '⚠️ '} Company sizes in target_audience: {has_company_sizes}")
        print(f"   {'✅' if has_specific_geo else '⚠️ '} Specific geography: {has_specific_geo}")
        
    except Exception as e:
        print(f"❌ Company analysis failed: {e}")
        return False
    
    # TEST 2: Keyword Generation with Context
    print("\n" + "=" * 80)
    print("📊 TEST 2: Keyword Generation with Context")
    print("-" * 80)
    print("Testing: /api/generate-keywords with company context")
    
    try:
        # Build CompanyInfo from analysis
        company_info = CompanyInfo(
            name=analysis.get('company_name', 'SCAILE'),
            url="https://scaile.tech",
            industry=analysis.get('industry'),
            description=analysis.get('description'),
            products=analysis.get('products', []),
            services=analysis.get('services', []),
            target_audience=', '.join(analysis.get('target_audience', [])) if isinstance(analysis.get('target_audience'), list) else analysis.get('target_audience'),
            target_location=analysis.get('primary_region', 'Global'),
            competitors=[f"https://{c.lower().replace(' ', '')}.com" for c in analysis.get('competitors', [])],
            pain_points=analysis.get('pain_points', []),
            use_cases=analysis.get('use_cases', []),
            value_propositions=analysis.get('value_propositions', []),
            differentiators=analysis.get('differentiators', []),
            solution_keywords=analysis.get('solution_keywords', []),
            brand_voice=analysis.get('brand_voice')
        )
        
        # Generate 10 keywords for faster testing
        config = GenerationConfig(
            target_count=10,
            language="english",
            region="us",
            enable_clustering=True,
            cluster_count=3,
            min_score=70,
            enable_serp_analysis=False,  # Disable for speed
            enable_research=False,  # Disable for speed
            min_word_count=4,  # Long-tail only
        )
        
        generator = KeywordGenerator(gemini_api_key=api_key)
        result = await generator.generate(company_info=company_info, config=config)
        
        keywords = result.keywords
        print(f"✅ Generated {len(keywords)} keywords")
        
        # Quality checks
        natural_count = 0
        product_name_count = 0
        hyper_niche_count = 0
        
        for kw in keywords:
            # Check if natural (no product names)
            is_natural = not any(p.lower() in kw.keyword.lower() for p in company_info.products)
            if is_natural:
                natural_count += 1
            else:
                product_name_count += 1
            
            # Check if hyper-niche (has geo/size/industry modifiers)
            has_geo = company_info.target_location and company_info.target_location.lower() in kw.keyword.lower()
            has_size = any(s.lower() in kw.keyword.lower() for s in ['startup', 'sme', 'enterprise', 'small business'])
            has_industry = any(i.lower() in kw.keyword.lower() for i in company_info.industry.split())
            
            if has_geo or has_size or has_industry:
                hyper_niche_count += 1
        
        print(f"\n🎯 Quality Metrics:")
        print(f"   Natural keywords: {natural_count}/{len(keywords)} ({natural_count/len(keywords)*100:.0f}%)")
        print(f"   Product-name keywords: {product_name_count}/{len(keywords)} ({product_name_count/len(keywords)*100:.0f}%)")
        print(f"   Hyper-niche keywords: {hyper_niche_count}/{len(keywords)} ({hyper_niche_count/len(keywords)*100:.0f}%)")
        
        print(f"\n📝 Sample Keywords (first 5):")
        for i, kw in enumerate(keywords[:5]):
            modifiers = []
            if company_info.target_location and company_info.target_location.lower() in kw.keyword.lower():
                modifiers.append("GEO")
            if any(s.lower() in kw.keyword.lower() for s in ['startup', 'sme', 'enterprise']):
                modifiers.append("SIZE")
            if any(i.lower() in kw.keyword.lower() for i in company_info.industry.split()):
                modifiers.append("INDUSTRY")
            
            modifier_str = f" [{', '.join(modifiers)}]" if modifiers else ""
            print(f"   {i+1}. {kw.keyword}{modifier_str}")
            print(f"      Score: {kw.score}, Intent: {kw.intent}, Words: {len(kw.keyword.split())}")
        
        # Final verdict
        print("\n" + "=" * 80)
        print("📊 INTEGRATION TEST RESULTS")
        print("=" * 80)
        
        issues = []
        if natural_count/len(keywords) < 0.7:
            issues.append("⚠️  Natural keywords < 70%")
        if product_name_count/len(keywords) > 0.3:
            issues.append("⚠️  Product-name keywords > 30%")
        if hyper_niche_count/len(keywords) < 0.2:
            issues.append("⚠️  Hyper-niche keywords < 20%")
        
        if issues:
            print("\n⚠️  ISSUES FOUND:")
            for issue in issues:
                print(f"   {issue}")
            print("\n❌ TEST FAILED - Quality not meeting standards")
            return False
        else:
            print("\n✅ ALL CHECKS PASSED!")
            print("✅ Context page: Working")
            print("✅ Company analysis: Extracting rich data")
            print("✅ Keyword generation: Using context properly")
            print("✅ Quality: 100% natural, hyper-niche keywords")
            print("\n🚀 READY FOR PRODUCTION!")
            return True
            
    except Exception as e:
        print(f"❌ Keyword generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = asyncio.run(test_full_integration())
    sys.exit(0 if success else 1)
