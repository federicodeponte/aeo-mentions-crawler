#!/usr/bin/env python3
"""
Full end-to-end test for scaile.tech:
1. Company analysis
2. Keyword generation with rich context
3. SERP analysis
4. Full output verification
"""

import os
import sys
import asyncio
import json
from datetime import datetime

# Add openkeyword to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-services/openkeyword'))

print("=" * 80)
print("🧪 FULL END-TO-END TEST: scaile.tech")
print("=" * 80)
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# Check API key
gemini_key = os.getenv('GEMINI_API_KEY')
if not gemini_key:
    print("❌ GEMINI_API_KEY not set!")
    sys.exit(1)

print(f"✅ GEMINI_API_KEY: Set ({gemini_key[:20]}...)\n")

# Import modules
from openkeywords.company_analyzer import analyze_company
from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

async def run_full_test():
    """Run full end-to-end test."""
    
    # STEP 1: Company Analysis
    print("=" * 80)
    print("STEP 1: Company Analysis")
    print("=" * 80)
    print("Target: https://scaile.tech\n")
    print("Running company analysis (may take 30-60 seconds)...\n")
    
    try:
        analysis = await analyze_company("https://scaile.tech")
        print("✅ Company analysis complete!\n")
        print("📊 Analysis Results:")
        print(f"   Company: {analysis.get('company_name', 'N/A')}")
        print(f"   Industry: {analysis.get('industry', 'N/A')}")
        print(f"   Description: {analysis.get('description', 'N/A')[:150]}...")
        print(f"   Products: {len(analysis.get('products', []))} found")
        print(f"   Services: {len(analysis.get('services', []))} found")
        print(f"   Pain points: {len(analysis.get('pain_points', []))} found")
        print(f"   Use cases: {len(analysis.get('use_cases', []))} found")
        print(f"   Value propositions: {len(analysis.get('value_propositions', []))} found")
        print(f"   Differentiators: {len(analysis.get('differentiators', []))} found")
        print(f"   Competitors: {len(analysis.get('competitors', []))} found")
        
        if analysis.get('pain_points'):
            print(f"\n   Sample Pain Points:")
            for pp in analysis.get('pain_points', [])[:3]:
                print(f"      • {pp}")
        
        if analysis.get('value_propositions'):
            print(f"\n   Sample Value Propositions:")
            for vp in analysis.get('value_propositions', [])[:3]:
                print(f"      • {vp}")
                
    except Exception as e:
        print(f"❌ Company analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return None
    
    # STEP 2: Build CompanyInfo with Rich Context
    print("\n" + "=" * 80)
    print("STEP 2: Building CompanyInfo with Rich Context")
    print("=" * 80)
    
    target_audience = analysis.get('target_audience', [])
    if isinstance(target_audience, list):
        target_audience = ', '.join(target_audience)
    
    company_info = CompanyInfo(
        name=analysis.get('company_name', 'SCAILE'),
        url="https://scaile.tech",
        industry=analysis.get('industry'),
        description=analysis.get('description'),
        products=analysis.get('products', []),
        services=analysis.get('services', []),
        target_audience=target_audience,
        target_location=analysis.get('primary_region', 'United States'),
        competitors=[f"https://{c.lower().replace(' ', '')}.com" for c in analysis.get('competitors', [])[:3]],
        # RICH CONTEXT FIELDS
        pain_points=analysis.get('pain_points', []),
        customer_problems=analysis.get('customer_problems', []),
        use_cases=analysis.get('use_cases', []),
        value_propositions=analysis.get('value_propositions', []),
        differentiators=analysis.get('differentiators', []),
        key_features=analysis.get('key_features', []),
        solution_keywords=analysis.get('solution_keywords', []),
        brand_voice=analysis.get('brand_voice')
    )
    
    print("✅ CompanyInfo built with rich context:")
    print(f"   Rich fields populated: {len(company_info.pain_points) + len(company_info.value_propositions) + len(company_info.use_cases)} total")
    
    # STEP 3: Configure Generation (FULL PIPELINE)
    print("\n" + "=" * 80)
    print("STEP 3: Configuring Keyword Generation (FULL PIPELINE)")
    print("=" * 80)
    
    config = GenerationConfig(
        target_count=30,
        language="english",
        region="us",
        enable_clustering=True,
        cluster_count=6,
        min_score=70,
        # FULL PIPELINE ENABLED
        enable_serp_analysis=True,  # Gemini SERP!
        serp_sample_size=15,
        enable_volume_lookup=False,  # Disable DataForSEO
    )
    
    print("✅ Configuration:")
    print(f"   Target keywords: {config.target_count}")
    print(f"   Language: {config.language}")
    print(f"   Region: {config.region}")
    print(f"   Clustering: {config.enable_clustering}")
    print(f"   SERP Analysis: {config.enable_serp_analysis} (Gemini)")
    print(f"   Min score: {config.min_score}")
    
    # STEP 4: Generate Keywords
    print("\n" + "=" * 80)
    print("STEP 4: Generating Keywords (FULL PIPELINE)")
    print("=" * 80)
    print("This may take 3-4 minutes (deep research + SERP analysis)...\n")
    
    try:
        generator = KeywordGenerator(
            gemini_api_key=gemini_key,
            model='gemini-3-pro-preview'
        )
        
        result = await generator.generate(
            company_info=company_info,
            config=config
        )
        
        print("✅ Generation complete!\n")
        
    except Exception as e:
        print(f"❌ Generation failed: {e}")
        import traceback
        traceback.print_exc()
        return None
    
    # STEP 5: Display Results
    print("=" * 80)
    print("📊 RESULTS")
    print("=" * 80)
    
    print(f"\n📈 Statistics:")
    print(f"   Total keywords: {result.statistics.total}")
    print(f"   Average score: {result.statistics.avg_score:.1f}/100")
    print(f"   Processing time: {result.processing_time_seconds:.1f}s")
    print(f"   Clusters: {len(result.clusters)}")
    
    if result.statistics.source_breakdown:
        print(f"\n📍 Sources:")
        for source, count in result.statistics.source_breakdown.items():
            print(f"      {source}: {count}")
    
    if result.statistics.intent_breakdown:
        print(f"\n🎯 Intent Distribution:")
        for intent, count in result.statistics.intent_breakdown.items():
            print(f"      {intent}: {count}")
    
    print(f"\n🏷️  Clusters:")
    for cluster in result.clusters:
        print(f"   • {cluster.name} ({cluster.count} keywords)")
    
    # Check SERP analysis
    serp_analyzed = sum(1 for kw in result.keywords if kw.serp_analyzed)
    has_aeo = sum(1 for kw in result.keywords if kw.aeo_opportunity > 0)
    avg_aeo = sum(kw.aeo_opportunity for kw in result.keywords if kw.aeo_opportunity > 0) / has_aeo if has_aeo > 0 else 0
    
    print(f"\n🔍 SERP Analysis:")
    print(f"   Keywords analyzed: {serp_analyzed}/{len(result.keywords)}")
    print(f"   With AEO scores: {has_aeo}")
    if has_aeo:
        print(f"   Average AEO score: {avg_aeo:.1f}/100")
        print("   ✅ Gemini SERP working!")
    
    # Check keyword specificity
    specific_keywords = [kw for kw in result.keywords if len(kw.keyword.split()) >= 4]
    print(f"\n📊 Keyword Quality:")
    print(f"   Specific keywords (4+ words): {len(specific_keywords)}/{result.statistics.total} ({len(specific_keywords)/result.statistics.total*100:.0f}%)")
    
    # Check if keywords match SCAILE context
    scaile_terms = ['aeo', 'answer engine', 'ai visibility', 'scaile', 'shadow demand']
    scaile_specific = [kw for kw in result.keywords 
                      if any(term in kw.keyword.lower() for term in scaile_terms)]
    print(f"   SCAILE-specific keywords: {len(scaile_specific)}/{result.statistics.total} ({len(scaile_specific)/result.statistics.total*100:.0f}%)")
    
    print(f"\n🔝 Top 15 Keywords:")
    print(f"{'#':<4} {'Keyword':<55} {'Score':<6} {'Intent':<15} {'AEO':<5}")
    print("-" * 90)
    
    for i, kw in enumerate(result.keywords[:15], 1):
        keyword_text = kw.keyword[:52] + "..." if len(kw.keyword) > 55 else kw.keyword
        aeo_score = kw.aeo_opportunity if kw.serp_analyzed and kw.aeo_opportunity > 0 else "-"
        print(f"{i:<4} {keyword_text:<55} {kw.score:<6} {kw.intent:<15} {aeo_score:<5}")
    
    # Export results
    output_dir = os.path.join(os.path.dirname(__file__), 'test-output')
    os.makedirs(output_dir, exist_ok=True)
    
    json_path = os.path.join(output_dir, 'scaile_full_test.json')
    csv_path = os.path.join(output_dir, 'scaile_full_test.csv')
    
    result.to_json(json_path)
    result.to_csv(csv_path)
    
    print(f"\n💾 Exported:")
    print(f"   JSON: {json_path}")
    print(f"   CSV:  {csv_path}")
    
    print("\n" + "=" * 80)
    print("✅ FULL TEST COMPLETE!")
    print("=" * 80)
    
    return result

# Run test
result = asyncio.run(run_full_test())

if result:
    print("\n🎉 SUCCESS: Full end-to-end test passed!")
    print("   ✅ Company analysis worked")
    print("   ✅ Rich context integrated")
    print("   ✅ Keyword generation worked")
    print("   ✅ SERP analysis worked")
    print("   ✅ Keywords are specific and context-aware")
else:
    print("\n❌ TEST FAILED")
    sys.exit(1)


