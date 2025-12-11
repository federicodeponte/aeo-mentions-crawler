#!/usr/bin/env python3
"""
Test if OpenRouter supports native Gemini tools format
"""
import asyncio
import os
import json
from openai import AsyncOpenAI

async def test_native_gemini_tools():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("❌ OPENROUTER_API_KEY not set")
        return
    
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        timeout=60.0
    )
    
    print("🧪 Testing Native Gemini Tools Format on OpenRouter")
    print("="*80)
    
    # Test 1: Native Gemini format via extra_body
    print("\n📤 Test 1: Native Gemini format (googleSearch + urlContext)")
    try:
        response = await client.chat.completions.create(
            model="google/gemini-3-pro-preview",
            messages=[
                {
                    "role": "user",
                    "content": "What is the latest news about OpenAI? Also, what does the website https://scaile.tech offer?"
                }
            ],
            extra_body={
                "tools": [
                    {"googleSearch": {}},
                    {"urlContext": {}}
                ]
            },
            max_tokens=1000
        )
        
        result = response.model_dump()
        print(f"✅ Native format worked!")
        print(f"   Response: {result['choices'][0]['message']['content'][:200]}...")
        
        with open("test_native_gemini_response.json", "w") as f:
            json.dump(result, f, indent=2)
        print("   Saved to: test_native_gemini_response.json")
        
    except Exception as e:
        print(f"❌ Native format failed: {e}")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    asyncio.run(test_native_gemini_tools())

