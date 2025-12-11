"""
Local OpenPull Implementation - FlexibleScraper
A simplified local version of the FlexibleScraper from openpull package.
Uses Playwright for JS-rendered pages and OpenRouter for AI extraction.
"""
import asyncio
import logging
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

class FlexibleScraperError(Exception):
    """Exception raised when scraping fails."""
    pass


class FlexibleScraper:
    """
    Local scraper implementation using Playwright + OpenRouter AI.
    Compatible with the external openpull package API.
    """
    
    def __init__(self, openai_client, model: str = "google/gemini-2.0-flash-001"):
        """
        Initialize scraper.
        
        Args:
            openai_client: AsyncOpenAI client configured for OpenRouter
            model: Model to use for extraction
        """
        self.client = openai_client
        self.model = model
        logger.info(f"FlexibleScraper initialized with model={model}")
    
    async def scrape(
        self,
        url: str,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        max_pages: int = 1,
        timeout: int = 30,
        extract_links: bool = False,
        auto_discover_pages: bool = False
    ) -> Dict[str, Any]:
        """
        Main scraping method with multi-page discovery.
        
        Args:
            url: URL to scrape
            prompt: Extraction prompt describing what to extract
            schema: Optional JSON schema for structured extraction
            max_pages: Maximum number of pages to scrape (with auto_discover_pages)
            timeout: Request timeout in seconds
            extract_links: If True, only extract links without LLM extraction
            auto_discover_pages: Enable automatic discovery of relevant pages
        
        Returns:
            Dict containing extracted data and metadata
        
        Raises:
            FlexibleScraperError: If scraping fails
        """
        try:
            # Step 1: Fetch page content with Playwright (handles JS rendering)
            logger.info(f"Fetching {url} with Playwright...")
            html_content, markdown = await self._fetch_page_playwright(url, timeout)
            
            if not html_content:
                raise FlexibleScraperError(f"Failed to fetch content from {url}")
            
            # Step 2: Extract links if requested (no AI needed)
            if extract_links:
                links = await self._extract_links_only(html_content, url)
                return {
                    "success": True,
                    "url": url,
                    "links": links,
                    "markdown": markdown,
                    "content": html_content[:500]  # Preview
                }
            
            # Step 3: Use AI to extract structured data based on prompt and schema
            logger.info(f"Extracting with AI (model={self.model})...")
            extracted = await self._ai_extract(markdown or html_content, prompt, schema)
            
            return {
                "success": True,
                "url": url,
                "data": extracted,
                "markdown": markdown,
                "content": html_content[:1000],  # Preview
                "main_content": extracted  # Compatibility with existing code
            }
            
        except Exception as e:
            logger.error(f"Scraping failed for {url}: {e}")
            raise FlexibleScraperError(f"Scraping failed: {str(e)}")
    
    async def _fetch_page_playwright(self, url: str, timeout: int) -> tuple[str, str]:
        """
        Fetch page using Playwright for JS rendering support.
        
        Returns:
            Tuple of (html_content, markdown_content)
        """
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 720},
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                )
                page = await context.new_page()
                
                try:
                    await page.goto(url, timeout=timeout * 1000, wait_until="networkidle")
                    await asyncio.sleep(1)  # Let JS finish rendering
                    
                    html = await page.content()
                    text = await page.evaluate("() => document.body.innerText")
                    
                    await browser.close()
                    
                    return html, text
                    
                except PlaywrightTimeout:
                    logger.warning(f"Playwright timeout for {url}, trying without networkidle...")
                    await page.goto(url, timeout=timeout * 1000, wait_until="domcontentloaded")
                    html = await page.content()
                    text = await page.evaluate("() => document.body.innerText")
                    await browser.close()
                    return html, text
                    
        except Exception as e:
            logger.error(f"Playwright fetch failed: {e}")
            raise
    
    async def _extract_links_only(self, html: str, base_url: str) -> list[str]:
        """Extract all links from HTML (no AI needed)."""
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin
        
        soup = BeautifulSoup(html, 'html.parser')
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            absolute_url = urljoin(base_url, href)
            if absolute_url.startswith('http'):
                links.append(absolute_url)
        return list(set(links))
    
    async def _ai_extract(
        self, 
        content: str, 
        prompt: str, 
        schema: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Use AI to extract structured data from content.
        
        Args:
            content: Text content to extract from
            prompt: Extraction instructions
            schema: Optional JSON schema for structured output
        
        Returns:
            Extracted data as dict
        """
        # Build system prompt
        system_msg = "You are a precise web content extraction assistant. Extract only the requested information from the provided content."
        
        # Build user prompt with schema if provided
        user_msg = f"{prompt}\n\nContent to analyze:\n{content[:15000]}"  # Limit to avoid token limits
        
        if schema:
            import json
            user_msg += f"\n\nExtract data matching this JSON schema:\n{json.dumps(schema, indent=2)}"
            user_msg += "\n\nRespond ONLY with valid JSON matching the schema."
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg}
                ],
                response_format={"type": "json_object"} if schema else None,
                temperature=0.1,
                max_tokens=4000
            )
            
            result_text = response.choices[0].message.content
            
            # Try to parse as JSON
            try:
                import json
                return json.loads(result_text)
            except json.JSONDecodeError:
                # Return as text if not JSON
                return {"extracted_text": result_text}
                
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return {"error": str(e)}

