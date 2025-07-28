import os
import asyncio
import logging
from typing import List, Dict, Any, Optional
import re
import httpx
from urllib.parse import urlparse
import json

# OpenAI for ChatGPT
import openai

# Google Gemini
import google.generativeai as genai

# Azure OpenAI Service
from .azure_openai_service import AzureOpenAIService

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        # Initialize OpenAI client
        self.openai_client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Initialize Google Gemini
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Perplexity API key
        self.perplexity_api_key = os.getenv("PERPLEXITY_API_KEY")
        
        # Serper API key for search
        self.serper_api_key = os.getenv("SERPER_API_KEY")
        
        # Initialize Azure OpenAI Service
        self.azure_openai_service = AzureOpenAIService()
        
    async def process_prompt_test(self, prompt: str, company_name: str, 
                                models: List[str] = None) -> Dict[str, Any]:
        """Test a single prompt across multiple LLM models"""
        if models is None:
            models = ["chatgpt", "gemini", "perplexity", "azure-openai"]
        
        results = {}
        
        for model in models:
            try:
                if model == "chatgpt":
                    result = await self._process_with_chatgpt(prompt, company_name)
                elif model == "gemini":
                    result = await self._process_with_gemini(prompt, company_name)
                elif model == "perplexity":
                    result = await self._process_with_perplexity(prompt, company_name)
                elif model == "azure-openai":
                    result = await self._process_with_azure_openai(prompt, company_name)
                else:
                    logger.warning(f"Unknown model: {model}")
                    continue
                
                results[model] = result
                
            except Exception as e:
                logger.error(f"Error processing with {model}: {e}")
                results[model] = {
                    "error": str(e),
                    "response": "",
                    "links": [],
                    "ai_mentions": 0,
                    "source_mentions": 0
                }
        
        return results
    
    async def process_prompt_for_monitoring(self, prompt: str, company_name: str, 
                                          model: str) -> Dict[str, Any]:
        """Process a single prompt with a specific model for monitoring"""
        try:
            if model == "chatgpt":
                return await self._process_with_chatgpt(prompt, company_name)
            elif model == "gemini":
                return await self._process_with_gemini(prompt, company_name)
            elif model == "perplexity":
                return await self._process_with_perplexity(prompt, company_name)
            elif model == "azure-openai":
                return await self._process_with_azure_openai(prompt, company_name)
            else:
                raise ValueError(f"Unknown model: {model}")
                
        except Exception as e:
            logger.error(f"Error processing prompt with {model}: {e}")
            raise
    
    async def _process_with_chatgpt(self, prompt: str, company_name: str) -> Dict[str, Any]:
        """Process prompt with ChatGPT enhanced with search"""
        try:
            # Get search results for current information
            search_results = await self._get_search_context(prompt)
            
            # Build enhanced prompt with search context
            enhanced_prompt = self._build_search_enhanced_prompt(prompt, search_results)
            
            response = await asyncio.to_thread(
                self.openai_client.chat.completions.create,
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant with access to current information. Use the provided search results to give up-to-date answers. Include relevant sources and links when possible."
                    },
                    {
                        "role": "user",
                        "content": enhanced_prompt
                    }
                ],
                max_tokens=2000
            )
            
            response_text = response.choices[0].message.content
            
            # Extract links and analyze
            links = self._extract_links(response_text)
            ai_mentions = self._count_mentions(response_text, company_name)
            
            # Analyze source content for mentions
            source_mentions = await self._analyze_sources_for_mentions(links, company_name)
            
            return {
                "response": response_text,
                "links": links,
                "ai_mentions": ai_mentions,
                "source_mentions": source_mentions,
                "model": "chatgpt",
                "search_results_count": len(search_results)
            }
            
        except Exception as e:
            logger.error(f"ChatGPT processing error: {e}")
            raise
    
    async def _process_with_gemini(self, prompt: str, company_name: str) -> Dict[str, Any]:
        """Process prompt with Google Gemini enhanced with search"""
        try:
            # Get search results for current information
            search_results = await self._get_search_context(prompt)
            
            # Build enhanced prompt with search context
            enhanced_prompt = self._build_search_enhanced_prompt(prompt, search_results)
            
            response = await asyncio.to_thread(
                self.gemini_model.generate_content,
                enhanced_prompt
            )
            
            response_text = response.text
            
            # Extract links and analyze
            links = self._extract_links(response_text)
            ai_mentions = self._count_mentions(response_text, company_name)
            
            # Analyze source content for mentions
            source_mentions = await self._analyze_sources_for_mentions(links, company_name)
            
            return {
                "response": response_text,
                "links": links,
                "ai_mentions": ai_mentions,
                "source_mentions": source_mentions,
                "model": "gemini",
                "search_results_count": len(search_results)
            }
            
        except Exception as e:
            logger.error(f"Gemini processing error: {e}")
            raise
    
    async def _process_with_perplexity(self, prompt: str, company_name: str) -> Dict[str, Any]:
        """Process prompt with Perplexity AI"""
        try:
            # Add search context to prompt
            enhanced_prompt = f"""
            {prompt}
            
            Please include relevant sources and links when possible in your response.
            """
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.perplexity_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "sonar",
                        "messages": [
                            {
                                "role": "user",
                                "content": enhanced_prompt
                            }
                        ]
                    }
                )
                
                response.raise_for_status()
                response_data = response.json()
                
                # Handle Perplexity response structure
                if "choices" in response_data and len(response_data["choices"]) > 0:
                    response_text = response_data["choices"][0]["message"]["content"]
                else:
                    raise Exception("Invalid response structure from Perplexity")
            
            # Extract links and analyze
            links = self._extract_links(response_text)
            ai_mentions = self._count_mentions(response_text, company_name)
            
            # Analyze source content for mentions
            source_mentions = await self._analyze_sources_for_mentions(links, company_name)
            
            return {
                "response": response_text,
                "links": links,
                "ai_mentions": ai_mentions,
                "source_mentions": source_mentions,
                "model": "perplexity"
            }
            
        except Exception as e:
            logger.error(f"Perplexity processing error: {e}")
            raise
    
    async def _process_with_azure_openai(self, prompt: str, company_name: str) -> Dict[str, Any]:
        """Process prompt with Azure OpenAI"""
        try:
            # Get search results for current information
            search_results = await self._get_search_context(prompt)
            
            # Use Azure OpenAI service
            result = await self.azure_openai_service.process_prompt(prompt, company_name, search_results)
            
            return result
            
        except Exception as e:
            logger.error(f"Azure OpenAI processing error: {e}")
            raise
    
    async def _get_search_context(self, prompt: str) -> List[Dict[str, Any]]:
        """Get search results to enhance prompt with current information"""
        try:
            # Extract key search terms from prompt
            search_query = self._extract_search_query(prompt)
            
            if not search_query:
                return []
            
            # Get search results
            search_results = await self.search_with_serper(search_query)
            
            # Limit to top 5 results to avoid token limits
            return search_results[:5]
            
        except Exception as e:
            logger.warning(f"Error getting search context: {e}")
            return []
    
    def _extract_search_query(self, prompt: str) -> str:
        """Extract search query from prompt"""
        # Remove common prompt words and focus on key terms
        prompt_lower = prompt.lower()
        
        # Look for current/recent indicators
        current_indicators = [
            "latest", "current", "recent", "today", "now", "2024", "2025",
            "stock price", "market", "news", "trending", "developments"
        ]
        
        has_current_context = any(indicator in prompt_lower for indicator in current_indicators)
        
        if has_current_context:
            # Extract the main topic from the prompt
            # Remove common words and keep the key terms
            words = prompt.split()
            filtered_words = []
            
            for word in words:
                word_clean = re.sub(r'[^\w\s]', '', word.lower())
                if len(word_clean) > 3 and word_clean not in ['what', 'are', 'the', 'and', 'for', 'with', 'that', 'this', 'from', 'about', 'when', 'where', 'which', 'will', 'have', 'been', 'they', 'their', 'them', 'these', 'those']:
                    filtered_words.append(word)
            
            return ' '.join(filtered_words[:8])  # Limit to 8 words
        
        return ""
    
    def _build_search_enhanced_prompt(self, original_prompt: str, search_results: List[Dict[str, Any]]) -> str:
        """Build enhanced prompt with search results"""
        if not search_results:
            return original_prompt
        
        # Build search context
        search_context = "Here is some current information from recent searches:\n\n"
        
        for i, result in enumerate(search_results, 1):
            title = result.get('title', 'No title')
            snippet = result.get('snippet', 'No description')
            link = result.get('link', 'No link')
            
            search_context += f"{i}. {title}\n"
            search_context += f"   {snippet}\n"
            search_context += f"   Source: {link}\n\n"
        
        enhanced_prompt = f"""
{original_prompt}

{search_context}

Please use this current information to provide an up-to-date answer. Include relevant sources and links when possible.
"""
        
        return enhanced_prompt
    
    def _extract_links(self, text: str) -> List[Dict[str, Any]]:
        """Extract and categorize links from text"""
        try:
            # URL regex pattern
            url_pattern = r'https?://[^\s"\'<>]+'
            urls = re.findall(url_pattern, text)
            
            # Remove duplicates and categorize
            unique_urls = list(set(urls))
            categorized_links = []
            
            for url in unique_urls:
                try:
                    parsed_url = urlparse(url)
                    domain = parsed_url.netloc.lower()
                    
                    # Categorize the link
                    link_type = "other"
                    if "wikipedia.org" in domain:
                        link_type = "wikipedia"
                    elif "youtube.com" in domain or "youtu.be" in domain:
                        link_type = "youtube"
                    elif "twitter.com" in domain or "x.com" in domain:
                        link_type = "twitter"
                    elif "linkedin.com" in domain:
                        link_type = "linkedin"
                    elif "github.com" in domain:
                        link_type = "github"
                    elif any(news in domain for news in ["bbc.com", "cnn.com", "reuters.com", "bloomberg.com"]):
                        link_type = "news"
                    
                    categorized_links.append({
                        "url": url,
                        "domain": parsed_url.netloc,
                        "type": link_type
                    })
                    
                except Exception as e:
                    logger.warning(f"Error parsing URL {url}: {e}")
                    continue
            
            return categorized_links
            
        except Exception as e:
            logger.error(f"Error extracting links: {e}")
            return []
    
    def _count_mentions(self, text: str, company_name: str) -> int:
        """Count mentions of company name in text"""
        try:
            # Create case-insensitive regex pattern
            pattern = re.compile(re.escape(company_name), re.IGNORECASE)
            matches = pattern.findall(text)
            return len(matches)
        except Exception as e:
            logger.error(f"Error counting mentions: {e}")
            return 0
    
    async def _analyze_sources_for_mentions(self, links: List[Dict[str, Any]], 
                                          company_name: str) -> int:
        """Analyze source content for company mentions"""
        total_mentions = 0
        
        for link in links:
            try:
                # Skip certain link types that might not have accessible content
                if link["type"] in ["youtube", "twitter"]:
                    continue
                
                # Fetch and analyze content
                content = await self._fetch_url_content(link["url"])
                if content:
                    mentions = self._count_mentions(content, company_name)
                    total_mentions += mentions
                    
            except Exception as e:
                logger.warning(f"Error analyzing source {link['url']}: {e}")
                continue
        
        return total_mentions
    
    async def _fetch_url_content(self, url: str) -> Optional[str]:
        """Fetch content from URL"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # Extract text content (basic HTML stripping)
                content = response.text
                
                # Remove HTML tags
                content = re.sub(r'<[^>]+>', ' ', content)
                
                # Remove extra whitespace
                content = re.sub(r'\s+', ' ', content).strip()
                
                return content
                
        except Exception as e:
            logger.warning(f"Error fetching URL {url}: {e}")
            return None
    
    async def search_with_serper(self, query: str) -> List[Dict[str, Any]]:
        """Search using Serper API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://google.serper.dev/search",
                    headers={
                        "X-API-KEY": self.serper_api_key,
                        "Content-Type": "application/json"
                    },
                    json={"q": query}
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Extract organic results
                organic_results = data.get("organic", [])
                return organic_results
                
        except Exception as e:
            logger.error(f"Serper search error: {e}")
            return [] 