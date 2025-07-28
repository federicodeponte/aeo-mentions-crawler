#!/usr/bin/env python3
"""
PEEC AI Standalone Monitor - No Server Required
Run this script directly to monitor companies without hosting a web server
"""

import os
import asyncio
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services
from services.llm_service import LLMService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StandaloneMonitor:
    def __init__(self):
        self.llm_service = LLMService()
        
    async def monitor_company(self, company_name: str, prompts: list):
        """Monitor a company with given prompts"""
        print(f"\n🔍 Monitoring {company_name}")
        print("=" * 50)
        
        results = {}
        models = ["perplexity", "gemini"]  # Skip ChatGPT due to API key issues
        
        for i, prompt in enumerate(prompts, 1):
            print(f"\n📋 Prompt {i}: {prompt[:60]}...")
            
            prompt_results = {}
            
            for model in models:
                try:
                    print(f"   🤖 Testing {model.upper()}...")
                    
                    result = await self.llm_service.process_prompt_for_monitoring(
                        prompt, company_name, model
                    )
                    
                    prompt_results[model] = {
                        'ai_mentions': result.get('ai_mentions', 0),
                        'links_count': len(result.get('links', [])),
                        'response_preview': result['response'][:200] + "..."
                    }
                    
                    print(f"      ✅ {result.get('ai_mentions', 0)} mentions, {len(result.get('links', []))} links")
                    
                except Exception as e:
                    print(f"      ❌ Error: {e}")
                    prompt_results[model] = {'error': str(e)}
            
            results[f"prompt_{i}"] = {
                'prompt': prompt,
                'results': prompt_results
            }
        
        return results
    
    async def run_daily_monitoring(self):
        """Run daily monitoring for all companies"""
        print("🚀 PEEC AI Standalone Daily Monitoring")
        print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Define companies and their monitoring prompts
        companies = {
            "Scaile": [
                "How does Scaile appear in AI search results compared to their main competitors?",
                "What are the latest mentions of Scaile in digital marketing discussions?",
                "How is Scaile positioned in AI-powered marketing tool comparisons?"
            ],
            "Valoon": [
                "What are the competitors of Valoon in construction communication?",
                "How does Valoon compare to other construction project management tools?",
                "What are the latest developments in construction communication platforms?"
            ]
        }
        
        all_results = {}
        
        for company_name, prompts in companies.items():
            try:
                results = await self.monitor_company(company_name, prompts)
                all_results[company_name] = results
                
                # Save results to file
                await self.save_results(company_name, results)
                
            except Exception as e:
                logger.error(f"Error monitoring {company_name}: {e}")
                all_results[company_name] = {'error': str(e)}
        
        print(f"\n✅ Monitoring Complete!")
        print(f"📊 Monitored {len(companies)} companies")
        print(f"💾 Results saved to files")
        
        return all_results
    
    async def save_results(self, company_name: str, results: dict):
        """Save results to JSON file"""
        import json
        
        filename = f"monitoring_results_{company_name}_{datetime.now().strftime('%Y%m%d')}.json"
        
        with open(filename, 'w') as f:
            json.dump({
                'company': company_name,
                'date': datetime.now().isoformat(),
                'results': results
            }, f, indent=2)
        
        print(f"   💾 Saved results to {filename}")

async def main():
    """Main execution function"""
    monitor = StandaloneMonitor()
    
    print("Choose monitoring option:")
    print("1. Run daily monitoring for all companies")
    print("2. Test single company")
    print("3. Test single prompt")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        await monitor.run_daily_monitoring()
    
    elif choice == "2":
        company_name = input("Enter company name: ").strip()
        prompts = [
            f"How does {company_name} appear in AI search results?",
            f"What are the latest mentions of {company_name}?",
            f"How is {company_name} positioned in industry discussions?"
        ]
        
        results = await monitor.monitor_company(company_name, prompts)
        print(f"\n📊 Results for {company_name}:")
        print(json.dumps(results, indent=2))
    
    elif choice == "3":
        prompt = input("Enter prompt: ").strip()
        company_name = input("Enter company name: ").strip()
        
        print(f"\n🧪 Testing prompt with {company_name}")
        
        try:
            result = await monitor.llm_service.process_prompt_for_monitoring(
                prompt, company_name, "perplexity"
            )
            
            print(f"✅ AI Mentions: {result.get('ai_mentions', 0)}")
            print(f"🔗 Links Found: {len(result.get('links', []))}")
            print(f"📝 Response Preview: {result['response'][:300]}...")
            
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    import json
    asyncio.run(main()) 