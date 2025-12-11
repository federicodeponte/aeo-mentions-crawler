"""
Local Tool Executor.
Executes tools (google_search, url_context) locally within the container.
"""
import os
import json
import logging
from typing import Dict, Any

# Local imports
try:
    from serp_dataforseo import DataForSeoProvider
except ImportError:
    DataForSeoProvider = None

from url_extractor import UrlExtractor

logger = logging.getLogger(__name__)

class ToolExecutor:
    def __init__(self):
        # Initialize SERP provider
        login = os.getenv("DATAFORSEO_LOGIN")
        password = os.getenv("DATAFORSEO_PASSWORD")
        self.serp = None
        if login and password and DataForSeoProvider:
            self.serp = DataForSeoProvider(login, password)
        else:
            logger.warning("DataForSEO credentials missing or module not loaded")

        # Initialize URL Extractor
        self.extractor = UrlExtractor()

    async def execute(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Execute a tool locally."""
        try:
            logger.info(f"ToolExecutor.execute: {tool_name} with args: {arguments}")
            if tool_name == "google_search":
                result = await self._execute_search(arguments)
                logger.info(f"Search result length: {len(result)}")
                return result
            elif tool_name == "url_context":
                result = await self._execute_url(arguments)
                logger.info(f"URL extraction result length: {len(result) if result else 0}")
                return result
            else:
                error_msg = f"Unknown tool: {tool_name}"
                logger.error(error_msg)
                return json.dumps({"error": error_msg})
        except Exception as e:
            import traceback
            logger.error(f"Tool execution failed ({tool_name}): {type(e).__name__}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return json.dumps({"error": str(e)})

    async def _execute_search(self, args: Dict[str, Any]) -> str:
        query = args.get("query")
        if not query:
            return json.dumps({"error": "No query provided"})
        
        if not self.serp:
            return json.dumps({"error": "SERP provider not configured"})

        result = await self.serp.search(query, num_results=10)
        
        if not result.success:
            return json.dumps({"error": result.error})
            
        # Format for LLM
        snippets = []
        for item in result.results[:5]: # Top 5 is usually enough context
            snippets.append(f"[{item.position}] {item.title}: {item.snippet} ({item.link})")
            
        return "\n\n".join(snippets)

    async def _execute_url(self, args: Dict[str, Any]) -> str:
        url = args.get("url")
        if not url:
            logger.error("No URL provided to url_context tool")
            return json.dumps({"error": "No URL provided"})
        
        logger.info(f"Extracting URL: {url}")
        result = await self.extractor.extract(url, prompt="Extract key information.")
        
        logger.info(f"Extraction result: success={result.success}, error={result.error}, content_length={len(result.raw_content) if result.raw_content else 0}")
        
        if not result.success:
            error_msg = result.error or "Unknown extraction error"
            logger.error(f"URL extraction failed: {error_msg}")
            return json.dumps({"error": error_msg})

        # Return raw content (markdown) or structured data; if empty, fall back to local fetcher with JS rendering
        content = result.raw_content or json.dumps(result.extracted_data or {})
        if not content or len(content.strip()) == 0:
            try:
                from fetcher import fetch_website
                fetch_res = await fetch_website(url, enable_js_rendering=True)
                html = fetch_res.html or ""
                logger.info(f"Fallback fetch_website: status={fetch_res.status_code}, html_len={len(html)}")
                if html:
                    content = html
            except Exception as e:
                logger.error(f"Fallback fetch_website failed: {e}")

        logger.info(f"Returning content of length: {len(content)}")
        return content

