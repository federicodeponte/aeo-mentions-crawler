#!/usr/bin/env python3
"""
PEEC AI Style - Service Provider Monitoring
Mimics PEEC AI's actual methodology: generate service-specific queries to see which companies get mentioned
"""

import os
import json
import asyncio
from typing import List, Dict, Any
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

# Configure OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

class PEECStylePromptGenerator:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    async def generate_service_queries(self, company_name: str, industry: str = None) -> List[Dict[str, Any]]:
        """
        Generate service-specific queries like PEEC AI does
        These are the actual search queries that get sent to AI platforms
        """
        
        # Create the prompt for ChatGPT to generate service-specific queries
        system_prompt = """You are an AI monitoring expert creating service-specific search queries for PEEC AI-style monitoring.

PEEC AI's methodology:
1. They generate automated queries for specific services/products
2. They send these queries to AI platforms (ChatGPT, Perplexity, Claude, Gemini)
3. They analyze which companies get mentioned in the AI responses
4. They track brand visibility, sentiment, and competitive positioning

Generate 10 service-specific search queries that people would actually ask when looking for services in this industry.
These queries should be natural, specific, and likely to return mentions of service providers.

Return as JSON array:
[
    {
        "query": "The actual search query people would ask",
        "category": "service_type|comparison|recommendation|problem_solving|trends",
        "target_service": "What service this query is looking for",
        "expected_companies": "What types of companies should be mentioned"
    }
]

Make queries specific, actionable, and focused on real user search behavior."""
        
        user_prompt = f"""Generate 10 service-specific search queries for monitoring {company_name} in the {industry or 'tech'} industry.

Focus on queries that people would actually ask when looking for services, such as:
- "What are the best [service type] tools?"
- "How to [specific problem] with [service type]?"
- "Compare [service type] providers"
- "Top [service type] for [specific use case]"
- "Best alternatives to [popular service]"

Make queries specific to {company_name}'s industry and likely to mention service providers."""
        
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            
            try:
                start_idx = content.find('[')
                end_idx = content.rfind(']') + 1
                
                if start_idx != -1 and end_idx != -1:
                    json_str = content[start_idx:end_idx]
                    queries = json.loads(json_str)
                    
                    cleaned_queries = []
                    for query in queries:
                        if isinstance(query, dict) and 'query' in query:
                            cleaned_queries.append({
                                'query': query['query'],
                                'category': query.get('category', 'general'),
                                'target_service': query.get('target_service', ''),
                                'expected_companies': query.get('expected_companies', '')
                            })
                    
                    return cleaned_queries
                else:
                    return self._generate_fallback_queries(company_name, industry)
                    
            except json.JSONDecodeError:
                return self._generate_fallback_queries(company_name, industry)
                
        except Exception as e:
            print(f"Error generating queries: {e}")
            return self._generate_fallback_queries(company_name, industry)
    
    def _generate_fallback_queries(self, company_name: str, industry: str = None) -> List[Dict[str, Any]]:
        """Generate fallback service-specific queries"""
        
        # Generic service queries that work for most industries
        base_queries = [
            {
                'query': f'What are the best {industry or "tech"} service providers?',
                'category': 'recommendation',
                'target_service': f'{industry or "tech"} services',
                'expected_companies': f'Top {industry or "tech"} service providers and platforms'
            },
            {
                'query': f'Compare {industry or "tech"} service providers and their features',
                'category': 'comparison',
                'target_service': f'{industry or "tech"} service comparison',
                'expected_companies': f'Major {industry or "tech"} service providers with feature comparisons'
            },
            {
                'query': f'Top {industry or "tech"} tools for small businesses',
                'category': 'recommendation',
                'target_service': f'{industry or "tech"} tools for SMBs',
                'expected_companies': f'{industry or "tech"} providers targeting small businesses'
            },
            {
                'query': f'Best {industry or "tech"} alternatives to popular platforms',
                'category': 'comparison',
                'target_service': f'{industry or "tech"} alternatives',
                'expected_companies': f'Alternative {industry or "tech"} providers and platforms'
            },
            {
                'query': f'How to choose the right {industry or "tech"} service provider?',
                'category': 'problem_solving',
                'target_service': f'{industry or "tech"} provider selection',
                'expected_companies': f'Leading {industry or "tech"} providers and selection criteria'
            },
            {
                'query': f'Most reliable {industry or "tech"} service providers in 2024',
                'category': 'recommendation',
                'target_service': f'reliable {industry or "tech"} services',
                'expected_companies': f'Trusted and reliable {industry or "tech"} service providers'
            },
            {
                'query': f'Compare pricing of {industry or "tech"} service providers',
                'category': 'comparison',
                'target_service': f'{industry or "tech"} pricing comparison',
                'expected_companies': f'{industry or "tech"} providers with pricing information'
            },
            {
                'query': f'Best {industry or "tech"} solutions for enterprise companies',
                'category': 'recommendation',
                'target_service': f'enterprise {industry or "tech"} solutions',
                'expected_companies': f'Enterprise-focused {industry or "tech"} service providers'
            },
            {
                'query': f'Top {industry or "tech"} trends and leading providers',
                'category': 'trends',
                'target_service': f'{industry or "tech"} trends',
                'expected_companies': f'Innovative {industry or "tech"} providers and trend leaders'
            },
            {
                'query': f'Customer reviews of {industry or "tech"} service providers',
                'category': 'comparison',
                'target_service': f'{industry or "tech"} customer reviews',
                'expected_companies': f'{industry or "tech"} providers with customer feedback'
            }
        ]
        
        return base_queries

async def test_peec_style_monitoring():
    """Test PEEC AI-style monitoring with service-specific queries"""
    
    print("🚀 PEEC AI Style - Service Provider Monitoring Test")
    print("=" * 70)
    
    generator = PEECStylePromptGenerator()
    
    # Test with different companies
    test_cases = [
        {"company": "Scaile", "industry": "construction communication"},
        {"company": "Valoon", "industry": "team communication"},
        {"company": "Slack", "industry": "team collaboration"}
    ]
    
    for test_case in test_cases:
        company = test_case["company"]
        industry = test_case["industry"]
        
        print(f"\n🔍 Testing {company} in {industry} industry")
        print("-" * 50)
        
        # Generate service-specific queries
        queries = await generator.generate_service_queries(company, industry)
        
        print(f"✅ Generated {len(queries)} service-specific queries:")
        print()
        
        for i, query_data in enumerate(queries, 1):
            print(f"{i:2d}. [{query_data['category']}] {query_data['query']}")
            print(f"    Target: {query_data['target_service']}")
            print(f"    Expected: {query_data['expected_companies']}")
            print()
        
        # Test one query with our LLM service
        print("🧪 Testing query with LLM service...")
        print("-" * 50)
        
        try:
            from services.llm_service import LLMService
            llm_service = LLMService()
            
            # Test with the first query
            test_query = queries[0]['query']
            print(f"Testing: {test_query}")
            
            result = await llm_service.process_prompt_for_monitoring(
                test_query, company, "perplexity"
            )
            
            print(f"✅ Result: {len(result['response'])} characters")
            print(f"   Links found: {len(result['links'])}")
            
            # Check for company mentions
            company_mentions = result['response'].lower().count(company.lower())
            print(f"   {company} mentions: {company_mentions}")
            
            print(f"\nPreview: {result['response'][:300]}...")
            
        except Exception as e:
            print(f"❌ Error testing query: {e}")
        
        print("=" * 70)
    
    return queries

if __name__ == "__main__":
    asyncio.run(test_peec_style_monitoring()) 