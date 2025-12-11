"""
Quick test of local openpull implementation
"""
import asyncio
import os
from openai import AsyncOpenAI
from openpull import FlexibleScraper

async def test_scrape():
    # Setup OpenRouter client
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("❌ OPENROUTER_API_KEY not set")
        return
    
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        timeout=120.0,
    )
    
    # Create scraper
    scraper = FlexibleScraper(
        openai_client=client,
        model="google/gemini-2.0-flash-001"
    )
    
    # Test with a simple website
    test_url = "https://scaile.tech"
    prompt = "Extract the company name, what they do, and main services/products offered."
    
    print(f"🧪 Testing scraper with {test_url}...")
    
    try:
        result = await scraper.scrape(
            url=test_url,
            prompt=prompt,
            schema={
                "type": "object",
                "properties": {
                    "company_name": {"type": "string"},
                    "description": {"type": "string"},
                    "services": {"type": "array", "items": {"type": "string"}},
                    "products": {"type": "array", "items": {"type": "string"}}
                }
            }
        )
        
        print("\n✅ Scraping successful!")
        print(f"URL: {result.get('url')}")
        print(f"Success: {result.get('success')}")
        
        data = result.get('data', {})
        print(f"\nExtracted data:")
        print(f"  Company: {data.get('company_name')}")
        print(f"  Description: {data.get('description', '')[:100]}...")
        print(f"  Services: {data.get('services', [])}")
        print(f"  Products: {data.get('products', [])}")
        
        if result.get('markdown'):
            print(f"\nMarkdown content length: {len(result['markdown'])} chars")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_scrape())

