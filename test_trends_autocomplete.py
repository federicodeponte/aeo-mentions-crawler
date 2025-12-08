#!/usr/bin/env python3
"""
Test Google Trends and Autocomplete integration.
"""
import sys
import os
import asyncio
import json
from datetime import datetime

# Add openkeyword to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-services', 'openkeyword'))

from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

async def main():
    # Get API key
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        print("❌ GEMINI_API_KEY not found in environment")
        sys.exit(1)
    
    print("=" * 80)
    print("🔍 TESTING GOOGLE TRENDS + AUTOCOMPLETE INTEGRATION")
    print("=" * 80)
    print()
    
    # Test company: SCAILE
    company = CompanyInfo(
        name="SCAILE",
        url="https://scaile.tech",
        industry="MarTech / AEO",
        description="Answer Engine Optimization services",
        products=["AEO Foundation Plan", "Visibility Engine"],
        services=["AI visibility reporting", "AEO content production"],
        target_audience="B2B SaaS companies",
        target_location="United States",
    )
    
    # Configuration with Trends + Autocomplete ENABLED
    config = GenerationConfig(
        target_count=15,  # Small test
        language="english",
        region="us",
        enable_clustering=True,
        cluster_count=3,
        min_score=40,
        # ENABLE TRENDS + AUTOCOMPLETE
        enable_autocomplete=True,
        enable_google_trends=True,
        autocomplete_expansion_limit=20,
        # Also enable other features for complete test
        enable_serp_analysis=True,
        enable_volume_lookup=False,  # Skip DataForSEO
    )
    
    print("📋 Configuration:")
    print(f"   Target count: {config.target_count}")
    print(f"   ✅ Autocomplete: ENABLED (limit: {config.autocomplete_expansion_limit})")
    print(f"   ✅ Google Trends: ENABLED")
    print(f"   ✅ SERP Analysis: ENABLED (Gemini native)")
    print()
    
    # Generate keywords
    generator = KeywordGenerator(
        gemini_api_key=gemini_key,
        model='gemini-3-pro-preview'
    )
    
    print(f"🚀 Starting generation for {company.name}...")
    print(f"   Started: {datetime.now().strftime('%H:%M:%S')}")
    print()
    
    import time
    start_time = time.time()
    
    try:
        result = await generator.generate(company, config)
        
        generation_time = time.time() - start_time
        
        print()
        print("=" * 80)
        print("✅ GENERATION COMPLETE")
        print("=" * 80)
        print(f"   Time: {generation_time:.1f}s ({generation_time/60:.1f} minutes)")
        print(f"   Total keywords: {len(result.keywords)}")
        print()
        
        # Analyze sources
        source_counts = {}
        for kw in result.keywords:
            source = kw.source
            source_counts[source] = source_counts.get(source, 0) + 1
        
        print("📊 Keyword Sources:")
        for source, count in sorted(source_counts.items(), key=lambda x: -x[1]):
            print(f"   {source:20s}: {count:3d} keywords")
        print()
        
        # Check for autocomplete keywords
        autocomplete_kws = [kw for kw in result.keywords if kw.source == "autocomplete"]
        print(f"🔤 Autocomplete Keywords: {len(autocomplete_kws)}")
        if autocomplete_kws:
            print("   Examples:")
            for kw in autocomplete_kws[:5]:
                print(f"   - '{kw.keyword}' (intent: {kw.intent}, score: {kw.score})")
        print()
        
        # Check for trends data
        kws_with_trends = [kw for kw in result.keywords if kw.trends_data]
        print(f"📊 Keywords with Trends Data: {len(kws_with_trends)}")
        if kws_with_trends:
            print("   Examples:")
            for kw in kws_with_trends[:3]:
                td = kw.trends_data
                print(f"   - '{kw.keyword}'")
                print(f"     Interest: {td.current_interest}/100 (avg: {td.avg_interest:.1f})")
                print(f"     Trend: {td.trend_direction} ({td.trend_percentage:+.1f}%)")
                if td.is_seasonal:
                    print(f"     Seasonal: YES (peaks: {', '.join(td.peak_months[:3])})")
                if td.rising_related:
                    print(f"     Rising: {', '.join(td.rising_related[:3])}")
                print()
        
        # Export results
        output_file = "test-output/trends_autocomplete_test.json"
        os.makedirs("test-output", exist_ok=True)
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
        
        print(f"💾 Full output saved to: {output_file}")
        print()
        
        # Summary
        print("=" * 80)
        print("🎯 INTEGRATION TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Total keywords generated: {len(result.keywords)}")
        print(f"✅ Autocomplete keywords: {len(autocomplete_kws)} ({len(autocomplete_kws)/len(result.keywords)*100:.1f}%)")
        print(f"✅ Keywords with trends data: {len(kws_with_trends)} ({len(kws_with_trends)/len(result.keywords)*100:.1f}%)")
        print(f"✅ Generation time: {generation_time:.1f}s")
        print()
        
        if len(autocomplete_kws) == 0:
            print("⚠️  Warning: No autocomplete keywords found")
            print("   This may happen if rate limits were hit or seeds didn't match")
        
        if len(kws_with_trends) == 0:
            print("⚠️  Warning: No trends data found")
            print("   This may happen if pytrends is not installed or rate limits were hit")
        
        print()
        print("✨ INTEGRATION TEST COMPLETE!")
        
    except Exception as e:
        print(f"\n❌ Generation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

