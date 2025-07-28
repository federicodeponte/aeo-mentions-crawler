#!/usr/bin/env python3
"""
PEEC AI - Prompt Generator
Uses ChatGPT to generate SEO monitoring prompts for a given URL
Based on PEEC AI's actual service provider monitoring approach
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

class PromptGenerator:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    async def generate_seo_prompts(self, url: str, company_name: str = None) -> List[Dict[str, Any]]:
        """
        Generate SEO monitoring prompts for a given URL using ChatGPT
        Based on PEEC AI's service provider monitoring approach
        """
        
        if not company_name:
            # Extract company name from URL
            company_name = url.split('.')[0].replace('https://', '').replace('http://', '').replace('www.', '')
        
        # Create the prompt for ChatGPT to generate SEO monitoring prompts
        system_prompt = """You are an SEO expert specializing in AI-powered search monitoring, similar to PEEC AI's approach. 
        Generate 10 diverse LLM SEO monitoring prompts for a given company/website.
        
        PEEC AI focuses on:
        1. Brand visibility in AI search environments (ChatGPT, Perplexity, Claude, Gemini)
        2. Service provider monitoring and competitive analysis
        3. Brand mention tracking across AI-generated responses
        4. Source impact analysis (which sources drive traffic)
        5. Competitor benchmarking in LLM search results
        6. Generative Engine Optimization (GEO) insights
        
        Each prompt should focus on different aspects:
        1. Service provider visibility in AI search
        2. Brand mentions and reputation in LLM responses
        3. Industry positioning and competitive landscape
        4. Service comparison and differentiation
        5. Market authority and trust signals
        6. Customer sentiment and service reviews
        7. Industry trends affecting service providers
        8. LLM SEO performance indicators
        9. Content strategy for service visibility
        10. Market opportunities and service gaps
        
        Return the prompts as a JSON array with this structure:
        [
            {
                "prompt": "The actual prompt text",
                "category": "service_provider_visibility|brand_monitoring|competitive_landscape|service_comparison|market_authority|sentiment_analysis|industry_trends|llm_seo_performance|content_strategy|market_opportunities",
                "focus": "Brief description of what this prompt monitors",
                "expected_insights": "What kind of insights this should provide"
            }
        ]
        
        Make prompts specific to service provider monitoring, actionable, and focused on LLM search visibility."""
        
        user_prompt = f"""Generate 10 LLM SEO monitoring prompts for: {company_name} ({url})
        
        Focus on PEEC AI's approach:
        - How {company_name} appears in AI search results (ChatGPT, Perplexity, Claude, Gemini)
        - Service provider visibility and competitive positioning
        - Brand mentions and reputation in AI-generated responses
        - Industry trends affecting {company_name} as a service provider
        - Customer sentiment and service reviews in LLM contexts
        - LLM SEO performance and authority signals
        - Content strategy for service provider visibility
        - Market opportunities and competitive gaps
        
        Make prompts specific to {company_name}'s industry as a service provider and their LLM search presence."""
        
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
            
            # Parse the response
            content = response.choices[0].message.content
            
            # Try to extract JSON from the response
            try:
                # Find JSON array in the response
                start_idx = content.find('[')
                end_idx = content.rfind(']') + 1
                
                if start_idx != -1 and end_idx != -1:
                    json_str = content[start_idx:end_idx]
                    prompts = json.loads(json_str)
                    
                    # Validate and clean prompts
                    cleaned_prompts = []
                    for prompt in prompts:
                        if isinstance(prompt, dict) and 'prompt' in prompt:
                            cleaned_prompts.append({
                                'prompt': prompt['prompt'],
                                'category': prompt.get('category', 'general'),
                                'focus': prompt.get('focus', ''),
                                'expected_insights': prompt.get('expected_insights', '')
                            })
                    
                    return cleaned_prompts
                else:
                    # Fallback: parse as plain text
                    return self._parse_plain_text_prompts(content, company_name)
                    
            except json.JSONDecodeError:
                # Fallback: parse as plain text
                return self._parse_plain_text_prompts(content, company_name)
                
        except Exception as e:
            print(f"Error generating prompts: {e}")
            return self._generate_fallback_prompts(company_name)
    
    def _parse_plain_text_prompts(self, content: str, company_name: str) -> List[Dict[str, Any]]:
        """Parse prompts from plain text response"""
        prompts = []
        lines = content.split('\n')
        current_prompt = ""
        current_category = "general"
        
        categories = [
            "service_provider_visibility", "brand_monitoring", "competitive_landscape", 
            "service_comparison", "market_authority", "sentiment_analysis", 
            "industry_trends", "llm_seo_performance", "content_strategy", "market_opportunities"
        ]
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line and not line.startswith('#') and not line.startswith('-'):
                # This looks like a prompt
                if len(line) > 20:  # Reasonable prompt length
                    category = categories[len(prompts) % len(categories)]
                    prompts.append({
                        'prompt': line,
                        'category': category,
                        'focus': f'Monitor {category.replace("_", " ")} for {company_name}',
                        'expected_insights': f'Insights about {category.replace("_", " ")}'
                    })
                    
                    if len(prompts) >= 10:
                        break
        
        return prompts[:10]
    
    def _generate_fallback_prompts(self, company_name: str) -> List[Dict[str, Any]]:
        """Generate fallback prompts if ChatGPT fails - based on PEEC AI's approach"""
        return [
            {
                'prompt': f'How does {company_name} appear in AI search results (ChatGPT, Perplexity, Claude, Gemini) compared to their main competitors? What is their service provider visibility?',
                'category': 'service_provider_visibility',
                'focus': 'LLM search visibility analysis',
                'expected_insights': 'Service provider visibility in AI search environments'
            },
            {
                'prompt': f'What are people saying about {company_name} as a service provider in AI-generated responses and online discussions?',
                'category': 'brand_monitoring',
                'focus': 'Service provider brand reputation',
                'expected_insights': 'Brand mentions and reputation in LLM contexts'
            },
            {
                'prompt': f'How is {company_name} positioned in the competitive landscape of service providers in their industry?',
                'category': 'competitive_landscape',
                'focus': 'Competitive positioning analysis',
                'expected_insights': 'Market positioning and competitive landscape'
            },
            {
                'prompt': f'How do {company_name}\'s services compare to similar service providers in terms of features, pricing, and market perception?',
                'category': 'service_comparison',
                'focus': 'Service comparison analysis',
                'expected_insights': 'Service differentiation and competitive advantages'
            },
            {
                'prompt': f'What is {company_name}\'s market authority and trust signals as a service provider in AI search results?',
                'category': 'market_authority',
                'focus': 'Market authority monitoring',
                'expected_insights': 'Authority and trust indicators in LLM search'
            },
            {
                'prompt': f'What is the customer sentiment and reviews about {company_name}\'s services across different platforms?',
                'category': 'sentiment_analysis',
                'focus': 'Customer sentiment analysis',
                'expected_insights': 'Customer satisfaction and service quality perception'
            },
            {
                'prompt': f'What are the latest industry trends affecting {company_name} as a service provider and their market position?',
                'category': 'industry_trends',
                'focus': 'Industry trend analysis',
                'expected_insights': 'Market trends and service provider positioning'
            },
            {
                'prompt': f'How does {company_name} perform in LLM SEO metrics and what are their visibility indicators in AI search?',
                'category': 'llm_seo_performance',
                'focus': 'LLM SEO performance monitoring',
                'expected_insights': 'AI search visibility and performance metrics'
            },
            {
                'prompt': f'What content strategy opportunities exist for {company_name} to improve their service provider visibility in AI search?',
                'category': 'content_strategy',
                'focus': 'Content strategy for service visibility',
                'expected_insights': 'Content opportunities for LLM search optimization'
            },
            {
                'prompt': f'What are the emerging market opportunities and service gaps that {company_name} could capitalize on?',
                'category': 'market_opportunities',
                'focus': 'Market opportunity identification',
                'expected_insights': 'Strategic opportunities and service gaps'
            }
        ]

async def test_prompt_generator():
    """Test the prompt generator with scaile.tech"""
    print("🚀 PEEC AI - Service Provider Monitoring Prompt Generator Test")
    print("=" * 70)
    
    generator = PromptGenerator()
    
    # Test with scaile.tech
    url = "https://scaile.tech"
    company_name = "Scaile"
    
    print(f"🔍 Generating service provider monitoring prompts for: {company_name} ({url})")
    print("-" * 70)
    
    prompts = await generator.generate_seo_prompts(url, company_name)
    
    print(f"✅ Generated {len(prompts)} service provider monitoring prompts:")
    print()
    
    for i, prompt in enumerate(prompts, 1):
        print(f"{i:2d}. [{prompt['category']}] {prompt['prompt']}")
        print(f"    Focus: {prompt['focus']}")
        print(f"    Expected: {prompt['expected_insights']}")
        print()
    
    # Test one prompt with our LLM service
    print("🧪 Testing generated prompt with LLM service...")
    print("-" * 70)
    
    try:
        from services.llm_service import LLMService
        llm_service = LLMService()
        
        # Test with the first prompt
        test_prompt = prompts[0]['prompt']
        print(f"Testing: {test_prompt}")
        
        result = await llm_service.process_prompt_for_monitoring(
            test_prompt, company_name, "perplexity"
        )
        
        print(f"✅ Result: {len(result['response'])} characters")
        print(f"   Links found: {len(result['links'])}")
        print(f"   Search results used: {result['search_results_count']}")
        print(f"\nPreview: {result['response'][:300]}...")
        
    except Exception as e:
        print(f"❌ Error testing prompt: {e}")
    
    return prompts

if __name__ == "__main__":
    asyncio.run(test_prompt_generator()) 