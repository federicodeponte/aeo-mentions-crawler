#!/usr/bin/env python3
"""
PEEC AI Simple Monitor - No Server Required
The simplest way to run PEEC AI monitoring using proper methodology
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
from peec_style_prompt_generator import PEECStylePromptGenerator

class SimpleMonitor:
    def __init__(self):
        self.llm_service = LLMService()
        self.prompt_generator = PEECStylePromptGenerator()
        
    async def monitor_company_organically(self, company_name: str, industry: str, models=None):
        """Monitor a company using proper PEEC AI methodology - generic industry questions"""
        if models is None:
            models = ["perplexity", "gemini"]  # Only working models
        
        print(f"\n🔍 PEEC AI Organic Monitoring: {company_name}")
        print(f"🏭 Industry: {industry}")
        print("=" * 60)
        print("🎯 Using generic industry questions (no company names mentioned)")
        print("=" * 60)
        
        # Generate service-specific queries using PEEC methodology
        # Skip prompt generation if OpenAI key not configured
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key or openai_key == "your_openai_api_key_here":
            print("⚠️  OpenAI API key not configured, using fallback queries")
            queries = None
        else:
            try:
                queries = await self.prompt_generator.generate_service_queries(company_name, industry)
                print(f"📝 Generated {len(queries)} industry-specific queries")
            except Exception as e:
                print(f"⚠️  Prompt generation failed, using fallback queries: {e}")
                queries = None
        
        if queries is None:
            # Fallback to predefined industry queries
            if "marketing" in industry.lower() or "digital" in industry.lower():
                queries = [
                    {"query": "What are the best marketing automation tools in 2024?", "category": "recommendation"},
                    {"query": "Which companies are leading in digital marketing innovation?", "category": "comparison"},
                    {"query": "What are the top marketing platforms for small businesses?", "category": "recommendation"},
                    {"query": "Which tools help with marketing campaign optimization?", "category": "service_type"},
                    {"query": "What are effective digital marketing solutions for startups?", "category": "recommendation"}
                ]
            elif "construction" in industry.lower():
                queries = [
                    {"query": "What are the best communication tools for construction teams?", "category": "recommendation"},
                    {"query": "Which platforms help construction project management?", "category": "service_type"},
                    {"query": "What are leading construction collaboration solutions?", "category": "comparison"},
                    {"query": "Which tools are recommended for field worker communication?", "category": "recommendation"},
                    {"query": "What are the top construction industry communication platforms?", "category": "recommendation"}
                ]
            else:
                queries = [
                    {"query": f"What are the best tools for {industry} industry?", "category": "recommendation"},
                    {"query": f"Which companies are leading in {industry} innovation?", "category": "comparison"},
                    {"query": f"What are the top platforms for {industry} businesses?", "category": "recommendation"}
                ]
        
        all_results = {}
        total_mentions = 0
        
        for i, query_data in enumerate(queries[:5], 1):  # Test first 5 queries
            query = query_data["query"]
            print(f"\n📋 Query {i}/5: {query}")
            print("-" * 50)
            
            query_results = {}
            
            for model in models:
                print(f"   🤖 Testing {model.upper()}...")
                try:
                    response_data = await self.llm_service.process_prompt_for_monitoring(query, company_name, model)
                    
                    # Check for company mentions in the response
                    response_text = response_data.get('response', '').lower()
                    company_mentioned = company_name.lower() in response_text
                    mention_count = response_text.count(company_name.lower())
                    
                    # Also check existing mention detection
                    existing_mentions = response_data.get('ai_mentions', 0)
                    total_mentions_for_query = max(mention_count, existing_mentions)
                    
                    if company_mentioned or existing_mentions > 0:
                        print(f"      ✅ {company_name} mentioned {total_mentions_for_query} times!")
                        total_mentions += total_mentions_for_query
                    else:
                        print(f"      ⚪ No mention of {company_name}")
                    
                    query_results[model] = {
                        'company_mentioned': company_mentioned or existing_mentions > 0,
                        'mention_count': total_mentions_for_query,
                        'response_preview': response_data.get('response', '')[:200] + "...",
                        'links': len(response_data.get('links', []))
                    }
                    
                except Exception as e:
                    print(f"      ❌ Error: {e}")
                    query_results[model] = {'error': str(e)}
            
            all_results[f"query_{i}"] = {
                'query': query,
                'category': query_data.get('category', 'unknown'),
                'results': query_results
            }
        
        # Save results
        filename = f"organic_monitor_{company_name}_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        with open(filename, 'w') as f:
            json.dump({
                'company': company_name,
                'industry': industry,
                'timestamp': datetime.now().isoformat(),
                'monitoring_type': 'organic_industry_questions',
                'total_mentions': total_mentions,
                'total_queries': len(queries[:5]),
                'mention_rate': f"{(total_mentions / (len(queries[:5]) * len(models)) * 100):.1f}%",
                'results': all_results
            }, f, indent=2)
        
        print(f"\n✅ Organic monitoring complete!")
        print(f"💾 Results saved to: {filename}")
        print(f"\n📊 Summary for {company_name}:")
        print(f"   🎯 Total mentions: {total_mentions}")
        print(f"   📝 Queries tested: {len(queries[:5])}")
        print(f"   🤖 Models tested: {len(models)}")
        print(f"   📈 Mention rate: {(total_mentions / (len(queries[:5]) * len(models)) * 100):.1f}%")
        
        return all_results

async def main():
    """Main function - automatically test common companies"""
    monitor = SimpleMonitor()
    
    print("🚀 PEEC AI Simple Monitor - Organic Testing")
    print("=" * 60)
    print("Testing companies with proper PEEC AI methodology:")
    print("✅ Generic industry questions (no company names)")
    print("✅ Multiple AI models")
    print("✅ Automatic mention detection")
    print("=" * 60)
    
    # Test companies automatically
    test_companies = [
        {"name": "Scaile", "industry": "digital marketing automation"},
        {"name": "Valoon", "industry": "construction communication"}
    ]
    
    for company_data in test_companies:
        try:
            await monitor.monitor_company_organically(
                company_data["name"], 
                company_data["industry"]
            )
            print("\n" + "="*60)
        except Exception as e:
            print(f"❌ Error monitoring {company_data['name']}: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 