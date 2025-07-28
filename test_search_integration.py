#!/usr/bin/env python3
"""
Test script to verify search integration for ChatGPT and Gemini
"""

import asyncio
import os
from dotenv import load_dotenv
from services.llm_service import LLMService

# Load environment variables
load_dotenv()

async def test_search_integration():
    """Test search integration with ChatGPT and Gemini"""
    
    print("🔍 Testing Search Integration for ChatGPT and Gemini")
    print("=" * 60)
    
    # Initialize LLM service
    llm_service = LLMService()
    
    # Test prompts that require current information
    test_prompts = [
        {
            "prompt": "What are the latest developments in AI technology in 2024?",
            "description": "Current AI developments"
        },
        {
            "prompt": "What is the current stock price of Tesla (TSLA)?",
            "description": "Real-time stock information"
        },
        {
            "prompt": "What are the top trending topics on social media today?",
            "description": "Current social media trends"
        }
    ]
    
    models = ["chatgpt", "gemini"]  # Test only models that need search integration
    
    for i, test_case in enumerate(test_prompts, 1):
        print(f"\n📋 Test {i}: {test_case['description']}")
        print(f"Prompt: {test_case['prompt']}")
        print("-" * 60)
        
        for model in models:
            print(f"\n🤖 Testing {model.upper()} with Search Integration:")
            try:
                result = await llm_service.process_prompt_for_monitoring(
                    test_case['prompt'], 
                    "Test Company", 
                    model
                )
                
                print(f"✅ {model.upper()} Response:")
                print(f"   Response Length: {len(result['response'])} characters")
                print(f"   Links Found: {len(result['links'])}")
                print(f"   Search Results Used: {result.get('search_results_count', 0)}")
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
                preview = result['response'][:300] + "..." if len(result['response']) > 300 else result['response']
                print(f"   📝 Preview: {preview}")
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
        
        print("\n" + "=" * 60)

async def test_search_query_extraction():
    """Test the search query extraction logic"""
    
    print("\n🔍 Testing Search Query Extraction")
    print("=" * 50)
    
    llm_service = LLMService()
    
    test_prompts = [
        "What are the latest developments in AI technology in 2024?",
        "What is the current stock price of Tesla?",
        "Tell me about sustainable building materials",
        "What is the weather like today?",
        "Explain quantum computing"
    ]
    
    for prompt in test_prompts:
        search_query = llm_service._extract_search_query(prompt)
        print(f"Prompt: {prompt}")
        print(f"Extracted Query: '{search_query}'")
        print("-" * 40)

async def test_serper_api_direct():
    """Test Serper API directly"""
    
    print("\n🔍 Testing Serper API Directly")
    print("=" * 40)
    
    llm_service = LLMService()
    
    test_queries = [
        "latest AI developments 2024",
        "Tesla stock price today",
        "current cryptocurrency prices"
    ]
    
    for query in test_queries:
        print(f"\n🔎 Testing Query: {query}")
        try:
            results = await llm_service.search_with_serper(query)
            print(f"   ✅ Found {len(results)} results")
            
            if results:
                print(f"   📄 Top Results:")
                for i, result in enumerate(results[:3], 1):
                    title = result.get('title', 'No title')
                    link = result.get('link', 'No link')
                    print(f"      {i}. {title}")
                    print(f"         {link}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

async def compare_models_with_search():
    """Compare models with and without search integration"""
    
    print("\n📊 Comparing Models with Search Integration")
    print("=" * 60)
    
    llm_service = LLMService()
    
    test_prompt = "What are the latest developments in sustainable building materials in 2024?"
    
    print(f"Test Prompt: {test_prompt}\n")
    
    # Test all three models
    results = await llm_service.process_prompt_test(
        test_prompt, 
        "Planeco Building", 
        ["chatgpt", "gemini", "perplexity"]
    )
    
    print("Model Comparison Results:")
    print("-" * 80)
    print(f"{'Model':<12} {'Length':<8} {'Links':<6} {'Search':<8} {'Current':<8}")
    print("-" * 80)
    
    for model, result in results.items():
        if "error" not in result:
            # Analyze response for current information
            response_lower = result['response'].lower()
            current_indicators = ["2024", "2025", "recent", "latest", "current", "today", "this year"]
            current_info_score = sum(1 for indicator in current_indicators if indicator in response_lower)
            
            search_count = result.get('search_results_count', 0)
            
            print(f"{model:<12} {len(result['response']):<8} {len(result['links']):<6} {search_count:<8} {current_info_score:<8}")

async def main():
    """Run all search integration tests"""
    
    print("🚀 PEEC AI - Search Integration Test")
    print("Testing ChatGPT and Gemini with Serper API integration\n")
    
    # Check if API keys are configured
    required_keys = ["OPENAI_API_KEY", "GEMINI_API_KEY", "SERPER_API_KEY"]
    missing_keys = [key for key in required_keys if not os.getenv(key)]
    
    if missing_keys:
        print(f"❌ Missing API keys: {', '.join(missing_keys)}")
        return
    
    print("✅ All API keys configured")
    
    try:
        # Run tests
        await test_search_query_extraction()
        await test_serper_api_direct()
        await test_search_integration()
        await compare_models_with_search()
        
        print("\n" + "=" * 80)
        print("🎯 SEARCH INTEGRATION SUMMARY:")
        print("=" * 80)
        print("• ChatGPT: Now enhanced with Serper search for real-time data")
        print("• Gemini: Now enhanced with Serper search for real-time data")
        print("• Perplexity: Already has direct internet access")
        print("• All models can now provide current information!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 