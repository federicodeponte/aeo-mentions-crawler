#!/usr/bin/env python3
"""
Test Azure OpenAI integration with PEEC AI
"""

import os
import asyncio
import logging
from services.azure_openai_service import AzureOpenAIService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_azure_openai():
    """Test Azure OpenAI service"""
    print("🔵 Testing Azure OpenAI Service...")
    
    # Check environment variables
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    
    if not api_key:
        print("❌ AZURE_OPENAI_API_KEY not set")
        return False
    
    if not endpoint:
        print("❌ AZURE_OPENAI_ENDPOINT not set")
        return False
    
    if "your-azure-resource-name" in endpoint:
        print("❌ Please update AZURE_OPENAI_ENDPOINT with your actual Azure resource name")
        print(f"   Current: {endpoint}")
        print("   Should be: https://YOUR-RESOURCE-NAME.openai.azure.com")
        return False
    
    print(f"✅ Azure OpenAI API Key: {api_key[:20]}...")
    print(f"✅ Azure OpenAI Endpoint: {endpoint}")
    
    # Test the service
    try:
        service = AzureOpenAIService()
        
        if not service.available:
            print("❌ Azure OpenAI service not available")
            return False
        
        # Test with a simple prompt
        test_prompt = "What is Azure OpenAI and how does it work?"
        test_company = "Microsoft"
        
        print(f"🧪 Testing with prompt: {test_prompt}")
        result = await service.process_prompt(test_prompt, test_company)
        
        print("✅ Azure OpenAI test successful!")
        print(f"📝 Response preview: {result['response'][:200]}...")
        print(f"🔗 Links found: {len(result['links'])}")
        print(f"📊 AI mentions: {result['ai_mentions']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Azure OpenAI test failed: {e}")
        return False

async def test_mentions_storage():
    """Test company mentions storage functionality"""
    
    print("\n💾 Testing Company Mentions Storage")
    print("=" * 50)
    
    # Test with a prompt that should mention Scaile
    test_prompts = [
        "What are the top AI companies in the market?",
        "How does Scaile compare to other AI companies?",
        "What are the best AI tools for digital marketing?"
    ]
    
    company_name = "Scaile"
    models = ["azure-openai", "gemini", "perplexity"]
    
    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n📋 Test {i}: {prompt[:50]}...")
        
        for model in models:
            try:
                response = requests.post(f'http://localhost:8000/api/test/model/{model}', 
                    json={
                        'prompt': prompt,
                        'company_name': company_name
                    },
                    timeout=60
                )
                
                if response.status_code == 200:
                    result = response.json()
                    model_result = result['result']
                    
                    print(f"   🤖 {model.upper()}: {model_result['ai_mentions']} mentions")
                    
                    if model_result['ai_mentions'] > 0:
                        print(f"      ✅ Stored {model_result['ai_mentions']} mentions")
                    
                else:
                    print(f"   ❌ {model.upper()}: Failed")
                    
            except Exception as e:
                print(f"   ❌ {model.upper()}: Error - {e}")
    
    # Check stored mentions
    print(f"\n📊 Checking Stored Mentions for {company_name}")
    print("-" * 50)
    
    try:
        response = requests.get(f'http://localhost:8000/api/mentions?company_name={company_name}')
        
        if response.status_code == 200:
            data = response.json()
            mentions = data['mentions']
            
            print(f"📈 Total stored mentions: {len(mentions)}")
            
            if mentions:
                print("\n📋 Recent Mentions:")
                for mention in mentions[-5:]:  # Show last 5
                    print(f"   • {mention['model'].upper()}: {mention['ai_mentions']} mentions")
                    print(f"     Prompt: {mention['prompt'][:60]}...")
                    print(f"     Time: {mention['timestamp']}")
                    print()
            else:
                print("   No mentions stored yet")
                
        else:
            print(f"❌ Error retrieving mentions: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error checking mentions: {e}")

async def test_mentions_summary():
    """Test mentions summary functionality"""
    
    print("\n📊 Testing Mentions Summary")
    print("=" * 50)
    
    try:
        response = requests.get('http://localhost:8000/api/mentions/summary')
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"📈 Total mentions records: {data['total_mentions']}")
            
            if data['company_summary']:
                print("\n🏢 Company Summary:")
                for company, summary in data['company_summary'].items():
                    print(f"   • {company}: {summary['total_mentions']} mentions across {len(summary['models'])} models")
            
            if data['model_summary']:
                print("\n🤖 Model Summary:")
                for model, summary in data['model_summary'].items():
                    print(f"   • {model}: {summary['total_mentions']} mentions for {len(summary['companies'])} companies")
                    
        else:
            print(f"❌ Error retrieving summary: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error checking summary: {e}")

async def test_all_models():
    """Test all available models"""
    
    print("\n🤖 Testing All Available Models")
    print("=" * 50)
    
    # Check available models
    try:
        response = requests.get('http://localhost:8000/api/models')
        
        if response.status_code == 200:
            data = response.json()
            models = data['models']
            
            print("📋 Available Models:")
            for model in models:
                status_icon = "✅" if model['status'] == 'available' else "❌"
                print(f"   {status_icon} {model['name']}: {model['description']} ({model['status']})")
            
            # Test each available model
            test_prompt = "What are the latest developments in AI technology?"
            company_name = "AI"
            
            print(f"\n🧪 Testing with prompt: {test_prompt}")
            
            for model in models:
                if model['status'] == 'available':
                    try:
                        response = requests.post(f'http://localhost:8000/api/test/model/{model["name"]}', 
                            json={
                                'prompt': test_prompt,
                                'company_name': company_name
                            },
                            timeout=60
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            model_result = result['result']
                            
                            print(f"   ✅ {model['name'].upper()}: {model_result['ai_mentions']} mentions, {len(model_result.get('links', []))} links")
                        else:
                            print(f"   ❌ {model['name'].upper()}: Failed ({response.status_code})")
                            
                    except Exception as e:
                        print(f"   ❌ {model['name'].upper()}: Error - {e}")
                        
        else:
            print(f"❌ Error checking models: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing models: {e}")

async def main():
    """Run all tests"""
    print("🚀 PEEC AI - Azure OpenAI & Storage Test Suite")
    print("=" * 60)
    
    # Test Azure OpenAI
    azure_working = await test_azure_openai()
    
    # Test mentions storage
    await test_mentions_storage()
    
    # Test mentions summary
    await test_mentions_summary()
    
    # Test all models
    await test_all_models()
    
    print("\n" + "=" * 60)
    if azure_working:
        print("✅ Azure OpenAI integration is working!")
    else:
        print("❌ Azure OpenAI integration needs configuration")
    
    print("\n📝 Next Steps:")
    print("1. Check the company_mentions.jsonl file for stored data")
    print("2. Use /api/mentions endpoint to retrieve mentions")
    print("3. Use /api/mentions/summary for analytics")
    print("4. Configure Azure OpenAI endpoint in .env if needed")

if __name__ == "__main__":
    asyncio.run(main()) 