#!/usr/bin/env python3
"""
Test script to check internet access capabilities of each LLM model
This will help determine which models can provide real-time information
"""

import asyncio
import os
from dotenv import load_dotenv
from services.llm_service import LLMService

# Load environment variables
load_dotenv()

async def test_model_internet_access():
    """Test each model's ability to provide current information"""
    
    print("🌐 Testing Internet Access Capabilities of LLM Models\n")
    print("=" * 60)
    
    # Initialize LLM service
    llm_service = LLMService()
    
    # Test prompts that require current information
    test_prompts = [
        {
            "prompt": "What are the latest developments in AI technology in 2024? Please provide recent news and links.",
            "description": "Current AI developments"
        },
        {
            "prompt": "What is the current stock price of Tesla (TSLA)? Please provide the latest information.",
            "description": "Real-time stock information"
        },
        {
            "prompt": "What are the top trending topics on social media today? Please provide recent examples.",
            "description": "Current social media trends"
        }
    ]
    
    models = ["chatgpt", "gemini", "perplexity"]
    
    for i, test_case in enumerate(test_prompts, 1):
        print(f"\n📋 Test {i}: {test_case['description']}")
        print(f"Prompt: {test_case['prompt']}")
        print("-" * 60)
        
        for model in models:
            print(f"\n🤖 Testing {model.upper()}:")
            try:
                # Test with current date context
                enhanced_prompt = f"{test_case['prompt']}\n\nToday's date is {asyncio.get_event_loop().time()}. Please provide the most current information available."
                
                result = await llm_service.process_prompt_for_monitoring(
                    enhanced_prompt, 
                    "Test Company", 
                    model
                )
                
                print(f"✅ {model.upper()} Response:")
                print(f"   Response Length: {len(result['response'])} characters")
                print(f"   Links Found: {len(result['links'])}")
                print(f"   AI Mentions: {result['ai_mentions']}")
                print(f"   Source Mentions: {result['source_mentions']}")
                
                # Check for current information indicators
                current_indicators = [
                    "2024", "2025", "recent", "latest", "current", "today", 
                    "yesterday", "this week", "this month", "latest news"
                ]
                
                response_lower = result['response'].lower()
                current_info_count = sum(1 for indicator in current_indicators if indicator in response_lower)
                
                if current_info_count > 0:
                    print(f"   🟢 Current Info Indicators: {current_info_count}")
                else:
                    print(f"   🟡 Limited Current Info Indicators")
                
                # Show first few links if any
                if result['links']:
                    print(f"   🔗 Sample Links:")
                    for link in result['links'][:3]:
                        print(f"      - {link['url'][:60]}... ({link['type']})")
                
                # Show response preview
                preview = result['response'][:200] + "..." if len(result['response']) > 200 else result['response']
                print(f"   📝 Preview: {preview}")
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
        
        print("\n" + "=" * 60)

async def test_search_integration():
    """Test search integration for models without direct internet access"""
    
    print("\n🔍 Testing Search Integration for Models Without Direct Internet Access")
    print("=" * 80)
    
    llm_service = LLMService()
    
    # Test search queries
    search_queries = [
        "latest AI developments 2024",
        "Tesla stock price today",
        "current cryptocurrency prices"
    ]
    
    for query in search_queries:
        print(f"\n🔎 Search Query: {query}")
        try:
            search_results = await llm_service.search_with_serper(query)
            print(f"   ✅ Found {len(search_results)} search results")
            
            if search_results:
                print(f"   📄 Top Results:")
                for i, result in enumerate(search_results[:3], 1):
                    print(f"      {i}. {result.get('title', 'No title')}")
                    print(f"         {result.get('link', 'No link')}")
                    print(f"         {result.get('snippet', 'No snippet')[:100]}...")
        except Exception as e:
            print(f"   ❌ Search Error: {str(e)}")

async def test_model_comparison():
    """Compare model responses for the same prompt"""
    
    print("\n📊 Model Comparison Test")
    print("=" * 50)
    
    llm_service = LLMService()
    
    # Test prompt that should show differences in internet access
    test_prompt = "What are the latest developments in sustainable building materials? Please provide recent examples and sources."
    
    print(f"Prompt: {test_prompt}\n")
    
    results = await llm_service.process_prompt_test(
        test_prompt, 
        "Planeco Building", 
        ["chatgpt", "gemini", "perplexity"]
    )
    
    comparison_data = []
    
    for model, result in results.items():
        if "error" not in result:
            # Analyze response for current information
            response_lower = result['response'].lower()
            current_indicators = ["2024", "2025", "recent", "latest", "current", "today", "this year"]
            current_info_score = sum(1 for indicator in current_indicators if indicator in response_lower)
            
            comparison_data.append({
                "model": model,
                "response_length": len(result['response']),
                "links_count": len(result['links']),
                "current_info_score": current_info_score,
                "has_recent_links": any("2024" in link.get('url', '') for link in result['links'])
            })
    
    # Display comparison
    print("Model Comparison Results:")
    print("-" * 80)
    print(f"{'Model':<12} {'Length':<8} {'Links':<6} {'Current':<8} {'Recent':<8}")
    print("-" * 80)
    
    for data in comparison_data:
        print(f"{data['model']:<12} {data['response_length']:<8} {data['links_count']:<6} {data['current_info_score']:<8} {'Yes' if data['has_recent_links'] else 'No':<8}")

async def main():
    """Run all internet access tests"""
    
    print("🚀 PEEC AI - Internet Access Capability Test")
    print("Testing which models can provide real-time information\n")
    
    # Check if API keys are configured
    required_keys = ["OPENAI_API_KEY", "GEMINI_API_KEY", "PERPLEXITY_API_KEY", "SERPER_API_KEY"]
    missing_keys = [key for key in required_keys if not os.getenv(key)]
    
    if missing_keys:
        print(f"❌ Missing API keys: {', '.join(missing_keys)}")
        return
    
    print("✅ All API keys configured")
    
    try:
        # Run tests
        await test_model_internet_access()
        await test_search_integration()
        await test_model_comparison()
        
        print("\n" + "=" * 80)
        print("🎯 SUMMARY:")
        print("=" * 80)
        print("• Perplexity: Has direct internet access via API")
        print("• ChatGPT: No direct internet access - needs search integration")
        print("• Gemini: No direct internet access - needs search integration")
        print("• Serper API: Available for search integration with ChatGPT/Gemini")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 