#!/usr/bin/env python3
"""
Full integration test for content-manager with a real client
Tests both context analysis and keyword generation
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

async def test_client(company_url: str, company_name: str):
    """Test full flow for a client"""
    
    # Load API key
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        env_path = os.path.join(os.path.dirname(__file__), '.env.local')
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY=') and not line.strip().startswith('#'):
                        api_key = line.split('=', 1)[1].strip()
                        break
    
    if not api_key or api_key == 'your-gemini-key':
        print("⚠️  No valid GEMINI_API_KEY found")
        print("\n📝 CODE VERIFICATION (without live API):")
        print("=" * 80)
        
        # Verify imports work
        print("✅ openkeywords.company_analyzer imported")
        print("✅ openkeywords.generator imported")
        print("✅ openkeywords.models imported")
        
        # Verify code structure
        from inspect import signature
        print("\n📊 Company Analyzer Signature:")
        print(f"   {signature(analyze_company)}")
        
        print("\n📊 KeywordGenerator Methods:")
        gen = KeywordGenerator(gemini_api_key="test")
        print(f"   - generate: {signature(gen.generate)}")
        
        print("\n📊 CompanyInfo Fields:")
        from openkeywords.models import CompanyInfo
        print(f"   - {list(CompanyInfo.__annotations__.keys())[:10]}...")
        
        print("\n✅ All imports and code structure verified!")
        print("\n🔑 To run live test:")
        print("   1. Add valid GEMINI_API_KEY to .env.local")
        print("   2. Re-run this script")
        
        return
    
    print("=" * 80)
    print(f"🧪 FULL CLIENT TEST: {company_name}")
    print("=" * 80)
    
    # PHASE 1: Company Analysis (simulates /api/analyse-website)
    print(f"\n📊 PHASE 1: Company Analysis (Context Page)")
    print("-" * 80)
    print(f"URL: {company_url}")
    
    try:
        analysis = await analyze_company(company_url, api_key=api_key)
        
        print(f"✅ Analysis complete!")
        print(f"\n🏢 Company Details:")
        print(f"   Name: {analysis.get('company_name', 'Unknown')}")
        print(f"   Industry: {analysis.get('industry', 'Unknown')}")
        print(f"   Description: {analysis.get('description', 'N/A')[:100]}...")
        
        print(f"\n📦 Products ({len(analysis.get('products', []))}):")
        for i, p in enumerate(analysis.get('products', [])[:3], 1):
            print(f"   {i}. {p}")
        
        print(f"\n🛠️  Services ({len(analysis.get('services', []))}):")
        for i, s in enumerate(analysis.get('services', [])[:3], 1):
            print(f"   {i}. {s}")
        
        print(f"\n🎯 Target Audience:")
        audiences = analysis.get('target_audience', [])
        if isinstance(audiences, list):
            for i, a in enumerate(audiences[:3], 1):
                print(f"   {i}. {a}")
        else:
            print(f"   {audiences}")
        
        print(f"\n🌍 Primary Region: {analysis.get('primary_region', 'Unknown')}")
        
        # Check hyper-niche data quality
        has_sizes = any(
            size in str(analysis.get('target_audience', [])).lower()
            for size in ['startup', 'sme', 'enterprise', 'small business', 'mid-market']
        )
        has_geo = analysis.get('primary_region') and analysis.get('primary_region').lower() not in ['us', 'global', 'worldwide']
        
        print(f"\n🎯 Hyper-niche Data Quality:")
        print(f"   Company sizes in audience: {'✅' if has_sizes else '⚠️ '}")
        print(f"   Specific geography: {'✅' if has_geo else '⚠️ '}")
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # PHASE 2: Keyword Generation (simulates /api/generate-keywords)
    print("\n" + "=" * 80)
    print("📊 PHASE 2: Keyword Generation")
    print("-" * 80)
    
    try:
        # Build CompanyInfo from analysis
        company_info = CompanyInfo(
            name=analysis.get('company_name', company_name),
            url=company_url,
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
        
        # Generate 15 keywords for testing
        config = GenerationConfig(
            target_count=15,
            language="english",
            region="us",
            enable_clustering=True,
            cluster_count=3,
            min_score=70,
            enable_serp_analysis=False,  # Disable for speed
            enable_research=False,  # Disable for speed
            min_word_count=4,  # Long-tail only
        )
        
        print("⚙️  Configuration:")
        print(f"   Target: {config.target_count} keywords")
        print(f"   Min words: {config.min_word_count}")
        print(f"   Min score: {config.min_score}")
        
        generator = KeywordGenerator(gemini_api_key=api_key)
        
        import time
        start = time.time()
        result = await generator.generate(company_info=company_info, config=config)
        elapsed = time.time() - start
        
        keywords = result.keywords
        print(f"\n✅ Generated {len(keywords)} keywords in {elapsed:.1f}s")
        
        # Quality Analysis
        print("\n" + "=" * 80)
        print("📊 QUALITY ANALYSIS")
        print("=" * 80)
        
        natural_count = 0
        product_name_count = 0
        hyper_niche_count = 0
        word_counts = []
        
        for kw in keywords:
            # Natural vs product-name
            is_natural = not any(p.lower() in kw.keyword.lower() for p in company_info.products)
            if is_natural:
                natural_count += 1
            else:
                product_name_count += 1
            
            # Hyper-niche modifiers
            has_geo = company_info.target_location and company_info.target_location.lower() not in ['us', 'global', 'worldwide'] and company_info.target_location.lower() in kw.keyword.lower()
            has_size = any(s.lower() in kw.keyword.lower() for s in ['startup', 'sme', 'enterprise', 'small business', 'mid-market'])
            has_industry = any(i.lower() in kw.keyword.lower() for i in company_info.industry.split() if len(i) > 3)
            
            if has_geo or has_size or has_industry:
                hyper_niche_count += 1
            
            word_counts.append(len(kw.keyword.split()))
        
        avg_words = sum(word_counts) / len(word_counts) if word_counts else 0
        
        print(f"\n📊 Metrics:")
        print(f"   Natural keywords: {natural_count}/{len(keywords)} ({natural_count/len(keywords)*100:.0f}%)")
        print(f"   Product-name keywords: {product_name_count}/{len(keywords)} ({product_name_count/len(keywords)*100:.0f}%)")
        print(f"   Hyper-niche keywords: {hyper_niche_count}/{len(keywords)} ({hyper_niche_count/len(keywords)*100:.0f}%)")
        print(f"   Average word count: {avg_words:.1f}")
        
        # Sample keywords
        print(f"\n📝 Sample Keywords (first 5):")
        for i, kw in enumerate(keywords[:5], 1):
            modifiers = []
            if company_info.target_location and company_info.target_location.lower() not in ['us', 'global', 'worldwide'] and company_info.target_location.lower() in kw.keyword.lower():
                modifiers.append("GEO")
            if any(s.lower() in kw.keyword.lower() for s in ['startup', 'sme', 'enterprise', 'small business']):
                modifiers.append("SIZE")
            if any(i.lower() in kw.keyword.lower() for i in company_info.industry.split() if len(i) > 3):
                modifiers.append("INDUSTRY")
            
            modifier_str = f" [{', '.join(modifiers)}]" if modifiers else ""
            print(f"   {i}. {kw.keyword}{modifier_str}")
            print(f"      Score: {kw.score}, Intent: {kw.intent}, Words: {len(kw.keyword.split())}")
        
        # Final verdict
        print("\n" + "=" * 80)
        print("📊 TEST RESULTS")
        print("=" * 80)
        
        issues = []
        if natural_count/len(keywords) < 0.7:
            issues.append(f"⚠️  Natural keywords < 70% ({natural_count/len(keywords)*100:.0f}%)")
        if product_name_count/len(keywords) > 0.3:
            issues.append(f"⚠️  Product-name keywords > 30% ({product_name_count/len(keywords)*100:.0f}%)")
        if hyper_niche_count/len(keywords) < 0.2:
            issues.append(f"⚠️  Hyper-niche keywords < 20% ({hyper_niche_count/len(keywords)*100:.0f}%)")
        if avg_words < 4:
            issues.append(f"⚠️  Average word count < 4 ({avg_words:.1f})")
        
        if issues:
            print("\n⚠️  ISSUES FOUND:")
            for issue in issues:
                print(f"   {issue}")
            print("\n❌ TEST FAILED")
        else:
            print("\n✅ ALL CHECKS PASSED!")
            print("✅ Context analysis: Extracting rich data")
            print("✅ Keyword generation: Using context properly")
            print("✅ Quality: Natural, hyper-niche, long-tail")
            print("\n🚀 INTEGRATION WORKING PERFECTLY!")
            
    except Exception as e:
        print(f"❌ Keyword generation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    # Test with a real client
    client_url = sys.argv[1] if len(sys.argv) > 1 else "https://valoon.chat"
    client_name = sys.argv[2] if len(sys.argv) > 2 else "Valoon"
    
    asyncio.run(test_client(client_url, client_name))
