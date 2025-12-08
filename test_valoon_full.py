#!/usr/bin/env python3
"""
Full end-to-end test for valoon.chat
Includes company analysis and full keyword generation pipeline.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add the openkeyword package to path
sys.path.insert(0, str(Path(__file__).parent / "python-services" / "openkeyword"))

from openkeywords.company_analyzer import analyze_company
from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment")

async def main():
    print("=" * 80)
    print("🚀 VALOON.CHAT - FULL KEYWORD GENERATION TEST")
    print("=" * 80)
    print()
    
    # Initialize generator
    generator = KeywordGenerator(
        gemini_api_key=GEMINI_API_KEY,
        model="gemini-3-pro-preview",
    )
    
    # Step 1: Company Analysis
    print("📊 Step 1: Analyzing company...")
    print("   URL: https://valoon.chat")
    print()
    
    company_data = await analyze_company("https://valoon.chat")
    
    print("✅ Company analysis complete!")
    print(f"   Company: {company_data.get('name', 'N/A')}")
    print(f"   Industry: {company_data.get('industry', 'N/A')}")
    print(f"   Services: {', '.join(company_data.get('services', [])[:3])}...")
    print()
    
    # Build CompanyInfo
    company_info = CompanyInfo(
        name=company_data.get("company_name", company_data.get("name", "Valoon")),
        description=company_data.get("description", ""),
        industry=company_data.get("industry"),
        services=company_data.get("services", []),
        products=company_data.get("products", []),
        target_location=company_data.get("target_location", company_data.get("primary_region", "Switzerland")),
        website_url="https://valoon.chat",
        competitors=company_data.get("competitors", []),
        use_cases=company_data.get("use_cases", []),
        pain_points=company_data.get("pain_points", []),
        differentiators=company_data.get("differentiators", []),
    )
    
    # Step 2: Generate Keywords
    print("🔑 Step 2: Generating keywords...")
    print()
    
    config = GenerationConfig(
        target_count=50,
        language="en",
        region="ch",
        enable_research=True,
        enable_gap_analysis=True,
        enable_serp_analysis=True,
        enable_clustering=True,
        min_score=70,
    )
    
    start_time = datetime.now()
    result = await generator.generate(company_info=company_info, config=config)
    end_time = datetime.now()
    
    duration = (end_time - start_time).total_seconds()
    
    print()
    print("=" * 80)
    print("✅ GENERATION COMPLETE")
    print("=" * 80)
    print()
    
    # Statistics
    stats = result.statistics
    print("📊 STATISTICS:")
    print(f"   Total keywords: {stats.total}")
    print(f"   Average score: {stats.avg_score:.1f}/100")
    print()
    
    # Intent breakdown
    intent_counts = {}
    for kw in result.keywords:
        intent_counts[kw.intent] = intent_counts.get(kw.intent, 0) + 1
    
    print(f"   By intent:")
    for intent, count in sorted(intent_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"      • {intent.capitalize()}: {count}")
    print()
    
    # Source breakdown
    source_counts = {}
    for kw in result.keywords:
        source_counts[kw.source] = source_counts.get(kw.source, 0) + 1
    
    print(f"   By source:")
    for source, count in sorted(source_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"      • {source}: {count}")
    print()
    print(f"   Processing time: {duration:.1f}s ({duration/60:.1f} minutes)")
    print()
    
    # Top keywords
    print("🔝 TOP 20 KEYWORDS:")
    print()
    for i, kw in enumerate(result.keywords[:20], 1):
        intent_emoji = {
            "transactional": "💰",
            "commercial": "🛒",
            "question": "❓",
            "comparison": "⚖️",
            "informational": "📚",
        }.get(kw.intent, "•")
        
        volume_str = f"{kw.volume:,}" if kw.volume > 0 else "-"
        aeo_str = f"{kw.aeo_opportunity}" if kw.aeo_opportunity > 0 else "-"
        
        print(f"{i:2d}. {intent_emoji} {kw.keyword}")
        print(f"     Score: {kw.score}/100 | Intent: {kw.intent} | Volume: {volume_str} | AEO: {aeo_str}")
        if kw.cluster_name:
            print(f"     Cluster: {kw.cluster_name}")
        print()
    
    # Hyper-niche breakdown
    hyper_niche = [kw for kw in result.keywords if "hyper_niche" in kw.source]
    if hyper_niche:
        print(f"🎯 HYPER-NICHE KEYWORDS: {len(hyper_niche)}")
        print()
        for kw in hyper_niche[:10]:
            print(f"   • {kw.keyword} (score: {kw.score}, source: {kw.source})")
        print()
    
    # SERP Analysis summary
    serp_analyzed = [kw for kw in result.keywords if kw.serp_analyzed]
    if serp_analyzed:
        avg_aeo = sum(kw.aeo_opportunity for kw in serp_analyzed if kw.aeo_opportunity > 0) / len([kw for kw in serp_analyzed if kw.aeo_opportunity > 0]) if serp_analyzed else 0
        featured_snippets = sum(1 for kw in serp_analyzed if kw.has_featured_snippet)
        paa_count = sum(1 for kw in serp_analyzed if kw.has_paa)
        
        print(f"🔍 SERP ANALYSIS:")
        print(f"   Keywords analyzed: {len(serp_analyzed)}")
        print(f"   Avg AEO opportunity: {avg_aeo:.0f}/100")
        print(f"   Featured snippets: {featured_snippets}")
        print(f"   PAA sections: {paa_count}")
        print()
    
    # Save full results
    output_dir = Path(__file__).parent / "test-output"
    output_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # JSON output
    json_path = output_dir / f"valoon_full_test_{timestamp}.json"
    with open(json_path, "w") as f:
        json.dump(result.to_dict(), f, indent=2)
    print(f"💾 Full JSON saved: {json_path}")
    
    # CSV output
    csv_path = output_dir / f"valoon_full_test_{timestamp}.csv"
    import csv
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Keyword", "Intent", "Score", "Cluster", "Source", 
            "Volume", "Difficulty", "AEO Opp.", "Featured Snippet", "PAA"
        ])
        for kw in result.keywords:
            writer.writerow([
                kw.keyword,
                kw.intent,
                kw.score,
                kw.cluster_name or "",
                kw.source,
                kw.volume,
                kw.difficulty,
                kw.aeo_opportunity,
                "Yes" if kw.has_featured_snippet else "No",
                "Yes" if kw.has_paa else "No",
            ])
    print(f"💾 CSV saved: {csv_path}")
    print()
    
    print("=" * 80)
    print("✅ TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())

