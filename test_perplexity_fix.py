#!/usr/bin/env python3
"""
Quick test to debug Perplexity API issue
"""

import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_perplexity_direct():
    """Test Perplexity API directly"""
    
    print("🔍 Testing Perplexity API Directly")
    print("=" * 50)
    
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        print("❌ No Perplexity API key found")
        return
    
    print(f"✅ API Key: {api_key[:10]}...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "sonar",
                    "messages": [
                        {
                            "role": "user",
                            "content": "What is the current weather in New York?"
                        }
                    ]
                },
                timeout=30.0
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Success!")
                print(f"Response: {data['choices'][0]['message']['content'][:200]}...")
            else:
                print(f"❌ Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_perplexity_direct()) 