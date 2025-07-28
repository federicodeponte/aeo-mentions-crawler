#!/usr/bin/env python3
"""
PEEC AI Monitor - Simple & Working
Just run this script to monitor companies with AI models
"""

import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services
from services.llm_service import LLMService

async def test_single_prompt(prompt: str, company_name: str):
    """Test a single prompt with working models"""
    print(f"\n🔍 Testing: {prompt}")
    print(f"🏢 Company: {company_name}")
    print("=" * 60)
    
    llm_service = LLMService()
    models = ["perplexity", "gemini"]  # Only working models
    
    results = {}
    
    for model in models:
        try:
            print(f"   🤖 Testing {model.upper()}...")
            
            result = await llm_service.process_prompt_for_monitoring(
                prompt, company_name, model
            )
            
            mentions = result.get('ai_mentions', 0)
            links = len(result.get('links', []))
            
            results[model] = {
                'mentions': mentions,
                'links': links,
                'response_preview': result['response'][:150] + "..."
            }
            
            print(f"      ✅ {mentions} mentions, {links} links")
            
        except Exception as e:
            print(f"      ❌ {model} failed: {str(e)[:100]}...")
            results[model] = {'error': str(e)}
    
    return results

async def monitor_company(company_name: str):
    """Monitor a company with standard prompts"""
    print(f"\n🚀 Monitoring {company_name}")
    print("=" * 50)
    
    # Simple, clear prompts that work
    prompts = [
        f"How does {company_name} appear in AI search results?",
        f"What are the latest mentions of {company_name}?",
        f"How is {company_name} positioned in the market?"
    ]
    
    all_results = {}
    
    for i, prompt in enumerate(prompts, 1):
        print(f"\n📋 Prompt {i}/{len(prompts)}")
        results = await test_single_prompt(prompt, company_name)
        all_results[f"prompt_{i}"] = {
            'prompt': prompt,
            'results': results
        }
    
    # Save results
    filename = f"monitor_{company_name}_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    with open(filename, 'w') as f:
        json.dump({
            'company': company_name,
            'timestamp': datetime.now().isoformat(),
            'results': all_results
        }, f, indent=2)
    
    print(f"\n✅ {company_name} monitoring complete!")
    print(f"💾 Results saved to: {filename}")
    
    return all_results

async def main():
    """Main function"""
    print("🔍 PEEC AI Simple Monitor")
    print("=" * 40)
    
    while True:
        print("\nOptions:")
        print("1. Test single prompt")
        print("2. Monitor company (3 standard prompts)")
        print("3. Quick test both Scaile and Valoon")
        print("4. Exit")
        
        choice = input("\nChoose (1-4): ").strip()
        
        if choice == "1":
            company = input("Company name: ").strip()
            prompt = input("Your prompt: ").strip()
            if company and prompt:
                await test_single_prompt(prompt, company)
        
        elif choice == "2":
            company = input("Company name: ").strip()
            if company:
                await monitor_company(company)
        
        elif choice == "3":
            print("\n🚀 Quick test for both companies")
            await monitor_company("Scaile")
            await monitor_company("Valoon")
        
        elif choice == "4":
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    asyncio.run(main()) 