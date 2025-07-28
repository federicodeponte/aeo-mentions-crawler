#!/usr/bin/env python3
"""
Test Scaile.tech prompts with our PEEC AI system
"""

import asyncio
import json
import requests
from prompt_generator import PromptGenerator

async def test_scaile_monitoring():
    """Test comprehensive monitoring for Scaile.tech"""
    
    print("🚀 PEEC AI - Scaile.tech Monitoring Test")
    print("=" * 60)
    
    # Generate prompts
    generator = PromptGenerator()
    url = "https://scaile.tech"
    company_name = "Scaile"
    
    print(f"🔍 Generating monitoring prompts for: {company_name}")
    print("-" * 60)
    
    prompts = await generator.generate_seo_prompts(url, company_name)
    
    print(f"✅ Generated {len(prompts)} monitoring prompts")
    print()
    
    # Test each prompt with different models
    models = ["perplexity", "chatgpt", "gemini"]
    
    results = {}
    
    for i, prompt_data in enumerate(prompts[:3], 1):  # Test first 3 prompts
        prompt = prompt_data['prompt']
        category = prompt_data['category']
        
        print(f"📋 Test {i}: {category}")
        print(f"Prompt: {prompt}")
        print("-" * 60)
        
        prompt_results = {}
        
        for model in models:
            try:
                print(f"🤖 Testing {model.upper()}...")
                
                # Test via API
                response = requests.post(
                    "http://localhost:8000/api/test/model/" + model,
                    json={
                        "prompt": prompt,
                        "company_name": company_name
                    },
                    timeout=60
                )
                
                if response.status_code == 200:
                    result = response.json()
                    model_result = result['result']
                    
                    print(f"✅ {model.upper()}: {len(model_result['response'])} chars")
                    print(f"   Links: {len(model_result.get('links', []))}")
                    print(f"   AI mentions: {model_result.get('ai_mentions', 0)}")
                    
                    # Store result
                    prompt_results[model] = {
                        'response': model_result['response'][:500] + "..." if len(model_result['response']) > 500 else model_result['response'],
                        'length': len(model_result['response']),
                        'links': len(model_result.get('links', [])),
                        'ai_mentions': model_result.get('ai_mentions', 0)
                    }
                    
                else:
                    print(f"❌ {model.upper()}: API error {response.status_code}")
                    prompt_results[model] = {'error': f'API error {response.status_code}'}
                    
            except Exception as e:
                print(f"❌ {model.upper()}: {e}")
                prompt_results[model] = {'error': str(e)}
            
            print()
        
        results[f"prompt_{i}_{category}"] = {
            'prompt': prompt,
            'category': category,
            'models': prompt_results
        }
        
        print("=" * 60)
        print()
    
    # Summary
    print("📊 MONITORING RESULTS SUMMARY")
    print("=" * 60)
    
    for prompt_key, prompt_data in results.items():
        print(f"\n🔍 {prompt_data['category'].replace('_', ' ').title()}")
        print(f"Prompt: {prompt_data['prompt'][:100]}...")
        
        for model, result in prompt_data['models'].items():
            if 'error' in result:
                print(f"   {model.upper()}: ❌ {result['error']}")
            else:
                print(f"   {model.upper()}: ✅ {result['length']} chars, {result['links']} links, {result['ai_mentions']} AI mentions")
    
    # Save results
    with open('scaile_monitoring_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to: scaile_monitoring_results.json")
    
    return results

def show_current_prompts():
    """Show what prompts we currently run"""
    print("\n📋 CURRENT PEEC AI PROMPTS")
    print("=" * 60)
    
    current_prompts = [
        "What are the latest developments in AI technology?",
        "What is the current stock price of Tesla?",
        "What are the top trending topics on social media today?",
        "What are the competitors of valoon.chat with the highest SEO authority?",
        "What are the latest developments in sustainable building materials?"
    ]
    
    print("These are the generic prompts we've been testing with:")
    for i, prompt in enumerate(current_prompts, 1):
        print(f"{i}. {prompt}")
    
    print("\n🎯 NEW APPROACH:")
    print("We now generate company-specific prompts using ChatGPT!")
    print("This gives us much more targeted and relevant monitoring.")

if __name__ == "__main__":
    # Show current prompts
    show_current_prompts()
    
    # Test new prompt generation
    asyncio.run(test_scaile_monitoring()) 