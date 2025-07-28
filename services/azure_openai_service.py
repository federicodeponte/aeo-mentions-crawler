#!/usr/bin/env python3
"""
Azure OpenAI Service for PEEC AI
Uses Azure OpenAI endpoints instead of OpenAI directly
"""

import os
import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
from urllib.parse import urlparse
import re
import json

logger = logging.getLogger(__name__)

class AzureOpenAIService:
    def __init__(self):
        # Azure OpenAI configuration
        self.api_key = os.getenv("AZURE_OPENAI_API_KEY")
        self.endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        
        if not self.api_key or not self.endpoint:
            logger.warning("Azure OpenAI not configured. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT")
            self.available = False
        else:
            self.available = True
            
        # Serper API key for search
        self.serper_api_key = os.getenv("SERPER_API_KEY")
    
    async def process_prompt(self, prompt: str, company_name: str, search_results: list = None) -> Dict[str, Any]:
        """Process prompt with Azure OpenAI GPT-4"""
        if not self.available:
            raise Exception("Azure OpenAI not configured")
        
        try:
            # Build enhanced prompt with search context if available
            enhanced_prompt = self._build_search_enhanced_prompt(prompt, search_results)
            
            # Call Azure OpenAI API
            response = await self._call_azure_openai(enhanced_prompt)
            
            # Extract links and analyze
            links = self._extract_links(response)
            ai_mentions = self._count_mentions(response, company_name)
            
            # Analyze source content for mentions
            source_mentions = await self._analyze_sources_for_mentions(links, company_name)
            
            return {
                "response": response,
                "links": links,
                "ai_mentions": ai_mentions,
                "source_mentions": source_mentions,
                "model": "azure-openai",
                "search_results_count": len(search_results) if search_results else 0
            }
            
        except Exception as e:
            logger.error(f"Azure OpenAI processing error: {e}")
            raise
    
    async def _call_azure_openai(self, prompt: str) -> str:
        """Make API call to Azure OpenAI"""
        url = f"{self.endpoint}/openai/deployments/{self.deployment_name}/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
            "api-key": self.api_key
        }
        
        data = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful assistant with access to current information. Use the provided search results to give up-to-date answers. Include relevant sources and links when possible."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 2000,
            "temperature": 0.7
        }
        
        params = {
            "api-version": self.api_version
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=data, params=params)
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                error_msg = f"Azure OpenAI API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
    
    def _build_search_enhanced_prompt(self, prompt: str, search_results: list = None) -> str:
        """Build enhanced prompt with search context"""
        if not search_results:
            return prompt
        
        # Add search context to prompt
        context = "Based on the following current information:\n\n"
        for i, result in enumerate(search_results[:5], 1):  # Limit to 5 results
            context += f"{i}. {result.get('title', 'No title')}\n"
            context += f"   URL: {result.get('link', 'No link')}\n"
            context += f"   Snippet: {result.get('snippet', 'No snippet')}\n\n"
        
        enhanced_prompt = f"{context}Please answer the following question using this information:\n\n{prompt}"
        return enhanced_prompt
    
    async def _get_search_context(self, prompt: str) -> list:
        """Get search results for current context"""
        if not self.serper_api_key:
            return []
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://google.serper.dev/search",
                    headers={
                        "X-API-KEY": self.serper_api_key,
                        "Content-Type": "application/json"
                    },
                    json={"q": prompt}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("organic", [])
                else:
                    logger.warning(f"Search API error: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.warning(f"Search API error: {e}")
            return []
    
    def _extract_links(self, text: str) -> list:
        """Extract and categorize links from text"""
        # URL regex pattern
        url_pattern = r'https?://[^\s\)]+'
        urls = re.findall(url_pattern, text)
        
        links = []
        for url in urls:
            # Clean URL (remove trailing punctuation)
            clean_url = url.rstrip('.,;:!?')
            
            # Categorize link
            link_type = self._categorize_link(clean_url)
            
            links.append({
                "url": clean_url,
                "type": link_type
            })
        
        return links
    
    def _categorize_link(self, url: str) -> str:
        """Categorize link by domain"""
        try:
            domain = urlparse(url).netloc.lower()
            
            if "wikipedia.org" in domain:
                return "wikipedia"
            elif "youtube.com" in domain or "youtu.be" in domain:
                return "youtube"
            elif "twitter.com" in domain or "x.com" in domain:
                return "twitter"
            elif "linkedin.com" in domain:
                return "linkedin"
            elif "github.com" in domain:
                return "github"
            elif any(news in domain for news in ["cnn.com", "bbc.com", "reuters.com", "forbes.com", "techcrunch.com"]):
                return "news"
            else:
                return "other"
                
        except Exception:
            return "other"
    
    def _count_mentions(self, text: str, company_name: str) -> int:
        """Count mentions of company name in text"""
        if not company_name:
            return 0
        
        # Create regex pattern for company name (case insensitive)
        pattern = re.compile(re.escape(company_name), re.IGNORECASE)
        matches = pattern.findall(text)
        
        return len(matches)
    
    async def _analyze_sources_for_mentions(self, links: list, company_name: str) -> int:
        """Analyze source content for additional mentions"""
        if not links or not company_name:
            return 0
        
        total_mentions = 0
        
        for link in links[:3]:  # Limit to 3 links to avoid rate limiting
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(link["url"])
                    
                    if response.status_code == 200:
                        # Extract text content (simple approach)
                        text = response.text
                        # Remove HTML tags
                        text = re.sub(r'<[^>]+>', ' ', text)
                        # Count mentions
                        mentions = self._count_mentions(text, company_name)
                        total_mentions += mentions
                        
            except Exception as e:
                logger.warning(f"Error fetching URL {link['url']}: {e}")
                continue
        
        return total_mentions 