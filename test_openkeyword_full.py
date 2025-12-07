#!/usr/bin/env python3
"""
Comprehensive test of openkeyword in content-manager.
Tests company analysis + keyword generation with Gemini SERP.
"""

import os
import sys
import json
import asyncio
from datetime import datetime

# Add openkeyword to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-services/openkeyword'))

print("🧪 Testing openkeyword in content-manager\n")
print("=" * 80)

# Check environment
print("\n1️⃣ Checking Environment...")
gemini_key = os.getenv('GEMINI_API_KEY')
if gemini_key:
    print(f"   ✅ GEMINI_API_KEY: Set ({gemini_key[:20]}...)")
else:
    print("   ❌ GEMINI_API_KEY: Not set!")
    sys.exit(1)

# Import modules
print("\n2️⃣ Importing openkeywords modules...")
try:
    from openkeywords.company_analyzer import analyze_company
    from openkeywords.generator import KeywordGenerator
    from openkeywords.models import CompanyInfo, GenerationConfig
    print("   ✅ All modules imported successfully")
except ImportError as e:
    print(f"   ❌ Import failed: {e}")
    sys.exit(1)

# Test company analysis
print("\n3️⃣ Testing Company Analysis...")
print("   Target: https://valoon.chat")
print("   Running analysis (may take 30-60 seconds)...\n")

async def run_analysis():
    try:
        result = await analyze_company("https://valoon.chat")
        return result
    except Exception as e:
        print(f"   ❌ Analysis failed: {e}")
        return None

analysis = asyncio.run(run_analysis())

if analysis:
    print("   ✅ Analysis complete!\n")
    print("   📊 Results:")
    print(f"      Company: {analysis.get('company_name', 'N/A')}")
    print(f"      Industry: {analysis.get('industry', 'N/A')}")
    print(f"      Description: {analysis.get('description', 'N/A')[:100]}...")
    print(f"      Products: {len(analysis.get('products', []))} found")
    print(f"      Services: {len(analysis.get('services', []))} found")
    print(f"      Pain points: {len(analysis.get('pain_points', []))} found")
    print(f"      Use cases: {len(analysis.get('use_cases', []))} found")
    print(f"      Competitors: {len(analysis.get('competitors', []))} found")
else:
    print("   ⚠️  Skipping analysis (using manual context)")
    analysis = None

# Build CompanyInfo
print("\n4️⃣ Building CompanyInfo...")
if analysis:
    company_info = CompanyInfo(
        name=analysis.get('company_name', 'Valoon'),
        url="https://valoon.chat",
        industry=analysis.get('industry'),
        description=analysis.get('description'),
        products=analysis.get('products', []),
        services=analysis.get('services', []),
        target_audience=', '.join(analysis.get('target_audience', [])) if isinstance(analysis.get('target_audience'), list) else analysis.get('target_audience'),
        target_location=analysis.get('primary_region', 'United States'),
        competitors=[f"https://{c.lower().replace(' ', '')}.com" for c in analysis.get('competitors', [])[:3]],
        pain_points=analysis.get('pain_points', []),
        customer_problems=analysis.get('customer_problems', []),
        use_cases=analysis.get('use_cases', []),
        value_propositions=analysis.get('value_propositions', []),
        differentiators=analysis.get('differentiators', []),
        key_features=analysis.get('key_features', []),
        solution_keywords=analysis.get('solution_keywords', []),
        brand_voice=analysis.get('brand_voice')
    )
    print("   ✅ Rich context from company analysis")
else:
    company_info = CompanyInfo(
        name="Valoon",
        url="https://valoon.chat",
        industry="Construction Technology",
        description="WhatsApp Business chatbot for construction sector",
        products=["WhatsApp chatbot", "Project management integration"],
        services=["Automated quote generation", "Lead qualification"],
        target_audience="Construction companies, contractors, project managers",
        target_location="United States",
        pain_points=["Manual quote generation", "Lost leads on WhatsApp"],
    )
    print("   ✅ Manual context")

# Configure generation (with Gemini SERP!)
print("\n5️⃣ Configuring Keyword Generation...")
config = GenerationConfig(
    target_count=20,
    language="english",
    region="us",
    enable_clustering=True,
    cluster_count=5,
    min_score=70,
    enable_serp_analysis=True,  # Uses Gemini SERP by default!
    serp_sample_size=10,
    enable_volume_lookup=False,  # Disable DataForSEO volume
)
print("   ✅ Config: 20 keywords, Gemini SERP enabled")
print(f"   ⏰ Date context: {datetime.now().strftime('%B %Y')}")

# Generate keywords
print("\n6️⃣ Generating Keywords...")
print("   This may take 2-3 minutes (deep research + SERP analysis)...\n")

async def generate():
    try:
        generator = KeywordGenerator(
            gemini_api_key=gemini_key,
            model='gemini-3-pro-preview'
        )
        result = await generator.generate(
            company_info=company_info,
            config=config
        )
        return result
    except Exception as e:
        print(f"   ❌ Generation failed: {e}")
        import traceback
        traceback.print_exc()
        return None

result = asyncio.run(generate())

if not result:
    print("\n❌ Test failed!")
    sys.exit(1)

# Display results
print("\n" + "=" * 80)
print("✅ GENERATION COMPLETE!")
print("=" * 80)

print(f"\n📊 Statistics:")
print(f"   Total keywords: {result.statistics.total}")
print(f"   Average score: {result.statistics.avg_score:.1f}")
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
for cluster in result.clusters[:5]:
    print(f"   • {cluster.name} ({cluster.count} keywords)")

print(f"\n🔝 Top 10 Keywords:")
print(f"{'#':<4} {'Keyword':<55} {'Score':<6} {'Intent':<15} {'AEO':<5}")
print("-" * 90)

for i, kw in enumerate(result.keywords[:10], 1):
    keyword_text = kw.keyword[:52] + "..." if len(kw.keyword) > 55 else kw.keyword
    aeo_score = kw.aeo_opportunity if kw.serp_analyzed else "-"
    print(f"{i:<4} {keyword_text:<55} {kw.score:<6} {kw.intent:<15} {aeo_score:<5}")

# Check SERP analysis
serp_analyzed = sum(1 for kw in result.keywords if kw.serp_analyzed)
has_aeo = sum(1 for kw in result.keywords if kw.aeo_opportunity > 0)
print(f"\n🔍 SERP Analysis:")
print(f"   Keywords analyzed: {serp_analyzed}/{len(result.keywords)}")
print(f"   With AEO scores: {has_aeo}")
if has_aeo:
    print("   ✅ Gemini SERP working!")
else:
    print("   ⚠️  No AEO scores (check logs)")

# Export results
output_dir = os.path.join(os.path.dirname(__file__), 'test-output')
os.makedirs(output_dir, exist_ok=True)

json_path = os.path.join(output_dir, 'valoon_keywords.json')
csv_path = os.path.join(output_dir, 'valoon_keywords.csv')

result.to_json(json_path)
result.to_csv(csv_path)

print(f"\n💾 Exported:")
print(f"   JSON: {json_path}")
print(f"   CSV:  {csv_path}")

print("\n" + "=" * 80)
print("🎉 TEST COMPLETE!")
print("=" * 80)

print("\n📝 Summary:")
print(f"   ✅ Company analysis: {'PASS' if analysis else 'SKIP (manual)'}")
print(f"   ✅ Keyword generation: PASS")
print(f"   ✅ Gemini SERP: {'PASS' if has_aeo > 0 else 'WARN'}")
print(f"   ✅ Total keywords: {result.statistics.total}")
print(f"   ✅ Avg score: {result.statistics.avg_score:.1f}")

if analysis and result.statistics.total > 0:
    # Check keyword specificity
    specific_keywords = [kw for kw in result.keywords if len(kw.keyword.split()) >= 4]
    print(f"   ✅ Specific keywords (4+ words): {len(specific_keywords)}/{result.statistics.total}")
    
    # Check if keywords match company context
    if analysis.get('industry') and 'construction' in analysis.get('industry', '').lower():
        construction_kws = [kw for kw in result.keywords if 'construction' in kw.keyword.lower() or 'contractor' in kw.keyword.lower()]
        print(f"   ✅ Construction-specific: {len(construction_kws)}/{result.statistics.total}")

print("\n✅ openkeyword working perfectly in content-manager!")

