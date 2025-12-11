#!/usr/bin/env python3
"""Test AEO Mentions with hybrid architecture (Native Gemini + OpenRouter)."""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path to import from aeo-checks
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
def load_env():
    env_file = Path(__file__).parent.parent.parent / ".env.local"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    value = value.strip('"').strip("'")
                    os.environ[key] = value
        print(f"✅ Loaded environment from {env_file}")
        return True
    else:
        print(f"⚠️  No .env.local file found at {env_file}")
        return False

load_env()

from mentions_service import query_platform, AI_PLATFORMS

async def test_gemini_native():
    """Test Gemini with native SDK."""
    print("\n" + "="*80)
    print("🧪 Testing GEMINI with Native SDK")
    print("="*80)
    
    query = "What are the best AI coding assistants for developers?"
    
    result = await query_platform("gemini", query, AI_PLATFORMS["gemini"])
    
    if "error" in result:
        print(f"❌ Error: {result['error']}")
    else:
        print(f"✅ Success!")
        print(f"   Platform: {result['platform']}")
        print(f"   Tokens: {result['tokens']}")
        print(f"   Response length: {len(result['response'])} chars")
        print(f"\n📄 Response preview (first 300 chars):")
        print(f"   {result['response'][:300]}...")
    
    return result

async def test_claude_openrouter():
    """Test Claude with OpenRouter + DataForSEO."""
    print("\n" + "="*80)
    print("🧪 Testing CLAUDE with OpenRouter + DataForSEO")
    print("="*80)
    
    query = "What are the best AI coding assistants for developers?"
    
    result = await query_platform("claude", query, AI_PLATFORMS["claude"])
    
    if "error" in result:
        print(f"❌ Error: {result['error']}")
    else:
        print(f"✅ Success!")
        print(f"   Platform: {result['platform']}")
        print(f"   Tokens: {result['tokens']}")
        print(f"   Response length: {len(result['response'])} chars")
        print(f"\n📄 Response preview (first 300 chars):")
        print(f"   {result['response'][:300]}...")
    
    return result

async def test_chatgpt_openrouter():
    """Test ChatGPT (GPT-4.1) with OpenRouter + DataForSEO."""
    print("\n" + "="*80)
    print("🧪 Testing CHATGPT (GPT-4.1) with OpenRouter + DataForSEO")
    print("="*80)
    
    query = "What are the best AI coding assistants for developers?"
    
    result = await query_platform("chatgpt", query, AI_PLATFORMS["chatgpt"])
    
    if "error" in result:
        print(f"❌ Error: {result['error']}")
    else:
        print(f"✅ Success!")
        print(f"   Platform: {result['platform']}")
        print(f"   Tokens: {result['tokens']}")
        print(f"   Response length: {len(result['response'])} chars")
        print(f"\n📄 Response preview (first 300 chars):")
        print(f"   {result['response'][:300]}...")
    
    return result

async def test_perplexity_openrouter():
    """Test Perplexity with OpenRouter (native search)."""
    print("\n" + "="*80)
    print("🧪 Testing PERPLEXITY with OpenRouter (native search)")
    print("="*80)
    
    query = "What are the best AI coding assistants for developers?"
    
    result = await query_platform("perplexity", query, AI_PLATFORMS["perplexity"])
    
    if "error" in result:
        print(f"❌ Error: {result['error']}")
    else:
        print(f"✅ Success!")
        print(f"   Platform: {result['platform']}")
        print(f"   Tokens: {result['tokens']}")
        print(f"   Response length: {len(result['response'])} chars")
        print(f"\n📄 Response preview (first 300 chars):")
        print(f"   {result['response'][:300]}...")
    
    return result

async def main():
    print("""
================================================================================
🚀 AEO MENTIONS - HYBRID ARCHITECTURE TEST
   - Gemini: Native Gemini SDK + native google_search
   - Others: OpenRouter + DataForSEO
   
Testing all 4 platforms:
   1. Gemini (native SDK)
   2. Claude (OpenRouter + DataForSEO)
   3. ChatGPT/GPT-4.1 (OpenRouter + DataForSEO)
   4. Perplexity (OpenRouter native search)
================================================================================
""")
    
    # Test all four platforms
    results = await asyncio.gather(
        test_gemini_native(),
        test_claude_openrouter(),
        test_chatgpt_openrouter(),
        test_perplexity_openrouter(),
        return_exceptions=True
    )
    
    # Summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    
    platforms = ["Gemini", "Claude", "ChatGPT (GPT-4.1)", "Perplexity"]
    for platform, result in zip(platforms, results):
        if isinstance(result, Exception):
            print(f"   ❌ {platform}: {result}")
        elif "error" in result:
            print(f"   ❌ {platform}: {result['error']}")
        else:
            print(f"   ✅ {platform}: {result['tokens']} tokens, {len(result['response'])} chars")
    
    print("="*80)

if __name__ == "__main__":
    asyncio.run(main())

