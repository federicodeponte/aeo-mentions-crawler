#!/usr/bin/env python3
"""
Test native Gemini SDK with company analysis
"""
import asyncio
import json
from gemini_client import get_gemini_client

# Simple schema for testing
TEST_SCHEMA = {
    "type": "object",
    "properties": {
        "company_info": {
            "type": "object",
            "properties": {
                "description": {"type": "string"},
                "industry": {"type": "string"},
                "products": {"type": "array", "items": {"type": "string"}},
                "services": {"type": "array", "items": {"type": "string"}},
                "pain_points": {"type": "array", "items": {"type": "string"}},
            }
        },
        "competitors": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "website": {"type": "string"}
                }
            }
        }
    }
}

async def test_gemini_analysis():
    print("🧪 Testing Native Gemini SDK Company Analysis")
    print("="*80)
    
    client = get_gemini_client()
    
    try:
        result = await client.analyze_company(
            website_url="https://8fit.com",
            company_name="8fit",
            schema=TEST_SCHEMA
        )
        
        print("\n✅ Analysis successful!")
        print(json.dumps(result, indent=2))
        
        # Save result
        with open("test_gemini_native_analysis.json", "w") as f:
            json.dump(result, f, indent=2)
        print("\n💾 Saved to: test_gemini_native_analysis.json")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_gemini_analysis())

