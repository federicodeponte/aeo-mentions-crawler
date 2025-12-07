#!/usr/bin/env python3
"""
Test GeminiSerpAnalyzer in isolation to debug the issue.
"""

import os
import sys
import asyncio

# Add openkeyword to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-services/openkeyword'))

print("🧪 Testing GeminiSerpAnalyzer in Isolation\n")
print("=" * 80)

# Check environment
gemini_key = os.getenv('GEMINI_API_KEY')
if not gemini_key:
    print("❌ GEMINI_API_KEY not set!")
    sys.exit(1)

print(f"✅ GEMINI_API_KEY: Set ({gemini_key[:20]}...)\n")

# Import
from openkeywords.gemini_serp_analyzer import GeminiSerpAnalyzer

# Initialize
print("1️⃣ Initializing GeminiSerpAnalyzer...")
try:
    analyzer = GeminiSerpAnalyzer(
        gemini_api_key=gemini_key,
        language="en",
        country="us",
        model="gemini-3-pro-preview"
    )
    print("✅ Analyzer initialized\n")
except Exception as e:
    print(f"❌ Initialization failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test with single keyword
print("2️⃣ Testing with single keyword: 'construction project management'")
print("   (This should take ~5-10 seconds)\n")

async def test_single():
    try:
        analyses, bonus = await analyzer.analyze_keywords(
            ["construction project management"],
            extract_bonus=True
        )
        return analyses, bonus
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None

analyses, bonus = asyncio.run(test_single())

if analyses:
    print("\n" + "=" * 80)
    print("✅ ANALYSIS COMPLETE!")
    print("=" * 80)
    
    for kw, analysis in analyses.items():
        print(f"\n📊 Keyword: {kw}")
        print(f"   Error: {analysis.error or 'None'}")
        print(f"   Has Featured Snippet: {analysis.features.has_featured_snippet}")
        print(f"   Has PAA: {analysis.features.has_paa}")
        print(f"   PAA Questions: {len(analysis.features.paa_questions)}")
        print(f"   Related Searches: {len(analysis.features.related_searches)}")
        print(f"   Top Domains: {len(analysis.features.top_domains)}")
        print(f"   AEO Opportunity: {analysis.features.aeo_opportunity}/100")
        print(f"   AEO Reason: {analysis.features.aeo_reason[:100] if analysis.features.aeo_reason else 'None'}...")
        print(f"   Volume Estimate: {analysis.features.volume_estimate}")
        
        if analysis.features.paa_questions:
            print(f"\n   PAA Questions Found:")
            for q in analysis.features.paa_questions[:3]:
                print(f"      • {q}")
        
        if analysis.features.related_searches:
            print(f"\n   Related Searches:")
            for r in analysis.features.related_searches[:3]:
                print(f"      • {r}")
        
        if analysis.bonus_keywords:
            print(f"\n   Bonus Keywords: {len(analysis.bonus_keywords)}")
    
    if bonus:
        print(f"\n🎁 Bonus Keywords Found: {len(bonus)}")
        for b in bonus[:5]:
            print(f"   • {b}")
    
    print("\n" + "=" * 80)
    print("✅ GeminiSerpAnalyzer working correctly!")
    print("=" * 80)
else:
    print("\n❌ No analysis results returned")
    sys.exit(1)

