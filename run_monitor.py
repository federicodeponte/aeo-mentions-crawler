#!/usr/bin/env python3
"""
PEEC AI Monitor - Proper Organic Monitoring
Test if companies appear in AI responses to generic industry questions
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

async def run_monitoring():
    """Run proper organic monitoring - generic questions, check if companies appear"""
    print("🚀 PEEC AI Organic Monitor - Testing Industry Visibility")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print("🎯 Testing: Do companies appear in AI responses to generic industry questions?")
    print("=" * 60)
    
    llm_service = LLMService()
    models = ["perplexity", "gemini"]  # Only working models
    
    # Companies we're monitoring for
    companies_to_monitor = ["Scaile", "Valoon"]
    
    # GENERIC industry questions - NO company names mentioned
    industry_prompts = {
        "digital_marketing": [
            "What are the best AI-powered marketing automation tools in 2024?",
            "Which companies are leading in digital marketing technology innovation?",
            "What are the top marketing platforms for small to medium businesses?",
            "Which tools are recommended for marketing campaign optimization?",
            "What are the most effective digital marketing solutions for startups?"
        ],
        "construction_communication": [
            "What are the best communication platforms for construction teams?",
            "Which tools help construction companies manage project communication?",
            "What are the leading construction project management solutions?",
            "Which platforms are recommended for construction team collaboration?",
            "What are the top communication tools for field workers in construction?"
        ]
    }
    
    all_results = {}
    
    for category, prompts in industry_prompts.items():
        print(f"\n📋 Testing {category.replace('_', ' ').title()} Category")
        print("-" * 50)
        
        category_results = {}
        
        for i, prompt in enumerate(prompts, 1):
            print(f"\n🔍 Question {i}: {prompt}")
            
            prompt_results = {}
            
            for model in models:
                try:
                    print(f"   🤖 {model.upper()}...", end=" ")
                    
                    # Use empty company name since we're testing organic mentions
                    result = await llm_service.process_prompt_for_monitoring(
                        prompt, "", model  # Empty company name for organic testing
                    )
                    
                    # Check which companies appear in the response
                    response_text = result['response'].lower()
                    company_mentions = {}
                    
                    for company in companies_to_monitor:
                        # Count mentions of each company
                        mentions = response_text.count(company.lower())
                        if mentions > 0:
                            company_mentions[company] = mentions
                    
                    total_mentions = sum(company_mentions.values())
                    links = len(result.get('links', []))
                    
                    prompt_results[model] = {
                        'company_mentions': company_mentions,
                        'total_mentions': total_mentions,
                        'links': links,
                        'response_preview': result['response'][:200] + "..."
                    }
                    
                    # Show which companies were mentioned
                    if company_mentions:
                        mention_str = ", ".join([f"{comp}({count})" for comp, count in company_mentions.items()])
                        print(f"✅ Found: {mention_str}, {links} links")
                    else:
                        print(f"⚪ No target companies mentioned, {links} links")
                    
                except Exception as e:
                    print(f"❌ Error")
                    prompt_results[model] = {'error': str(e)[:50]}
            
            category_results[f"question_{i}"] = {
                'prompt': prompt,
                'results': prompt_results
            }
        
        all_results[category] = category_results
    
    # Save results
    filename = f"organic_monitor_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    with open(filename, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'monitoring_type': 'organic_industry_questions',
            'companies_monitored': companies_to_monitor,
            'results': all_results
        }, f, indent=2)
    
    print(f"\n✅ Organic Monitoring Complete!")
    print(f"💾 Results saved to: {filename}")
    
    # Show summary
    print(f"\n📊 Organic Visibility Summary:")
    print("=" * 40)
    
    for company in companies_to_monitor:
        total_mentions = 0
        total_questions = 0
        
        for category, category_data in all_results.items():
            for question_key, question_data in category_data.items():
                total_questions += 1
                for model, result in question_data.get('results', {}).items():
                    if 'company_mentions' in result:
                        total_mentions += result['company_mentions'].get(company, 0)
        
        visibility_score = (total_mentions / max(total_questions * len(models), 1)) * 100
        print(f"   {company}: {total_mentions} mentions across {total_questions} questions ({visibility_score:.1f}% visibility)")
    
    return all_results

if __name__ == "__main__":
    asyncio.run(run_monitoring()) 