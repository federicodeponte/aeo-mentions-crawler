#!/usr/bin/env python3
"""Test keyword generation timing with progress tracking"""
import sys
import os
import json
import asyncio
import time
from pathlib import Path

# Add openkeyword to path
openkeyword_path = os.path.join(os.path.dirname(__file__), 'python-services', 'openkeyword')
sys.path.insert(0, openkeyword_path)

from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

async def test_with_timing():
    """Test generation with detailed timing"""
    
    # Load API key
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        env_path = os.path.join(os.path.dirname(__file__), '.env.local')
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break
    
    print("=" * 80)
    print("⏱️  TIMING TEST: Keyword Generation Pipeline")
    print("=" * 80)
    
    # Simple company context (skip analysis to focus on generation)
    company = CompanyInfo(
        name="Test Company",
        url="https://example.com",
        industry="SaaS",
        description="Project management software",
        products=["Project Management Tool"],
        services=["Implementation", "Support"],
        target_audience="SMEs, Startups",
        target_location="US"
    )
    
    config = GenerationConfig(
        target_count=15,
        min_score=70,
        enable_research=True,
        enable_serp_analysis=True,
        min_word_count=4,
        language="english",
        region="us"
    )
    
    generator = KeywordGenerator(gemini_api_key=api_key)
    
    print("\n🚀 Starting generation...")
    print(f"   Target: {config.target_count} keywords")
    print(f"   Research: {config.enable_research}")
    print(f"   SERP: {config.enable_serp_analysis}")
    
    start_time = time.time()
    
    result = await generator.generate(company_info=company, config=config)
    
    elapsed = time.time() - start_time
    
    print("\n" + "=" * 80)
    print("✅ GENERATION COMPLETE")
    print("=" * 80)
    print(f"⏱️  Total Time: {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")
    print(f"📊 Keywords Generated: {len(result.keywords)}")
    print(f"⚡ Average per keyword: {elapsed/len(result.keywords):.1f}s")
    
    # Show timing breakdown
    if hasattr(result, 'metadata') and result.metadata:
        print("\n📊 Pipeline Breakdown:")
        if hasattr(result.metadata, 'generation_time'):
            print(f"   Total: {result.metadata.generation_time:.1f}s")

if __name__ == "__main__":
    asyncio.run(test_with_timing())
