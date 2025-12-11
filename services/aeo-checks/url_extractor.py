"""
URL Extractor - Wrapper around OpenPull for content extraction.
Using OpenRouter for AI extraction logic.
"""
import os
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class ExtractionResult(BaseModel):
    success: bool
    url: str
    extracted_data: Optional[Dict[str, Any]] = None
    raw_content: Optional[str] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None

class UrlExtractor:
    """Wrapper for OpenPull scraping."""
    
    def __init__(self):
        self.client = None
        self.model = "google/gemini-2.0-flash-001"
        
        try:
            from openai import AsyncOpenAI
        except ImportError:
            logger.error("openai package not installed - URL extraction will fail")
            return

        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            logger.error("OPENROUTER_API_KEY not found in environment - URL extraction will fail")
            return
        
        # OpenRouter client for OpenPull
        try:
            self.client = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                timeout=120.0,
            )
        except Exception as e:
            logger.error(f"Failed to initialize OpenRouter client: {e}")
            self.client = None

    async def extract(
        self, 
        url: str, 
        prompt: str = "Extract the main content.", 
        schema: Optional[Dict[str, Any]] = None
    ) -> ExtractionResult:
        start_time = datetime.now()
        
        if not self.client:
            return ExtractionResult(
                success=False, 
                url=url, 
                error="OpenRouter client not initialized (check OPENROUTER_API_KEY secret)"
            )
        
        try:
            from openpull import FlexibleScraper
        except ImportError:
            return ExtractionResult(
                success=False, url=url, error="OpenPull not installed"
            )

        try:
            logger.info(f"Initializing FlexibleScraper with model={self.model}")
            scraper = FlexibleScraper(
                openai_client=self.client,
                model=self.model
            )
            
            logger.info(f"Scraping {url} with OpenPull...")
            # Use OpenPull's scrape method
            result = await scraper.scrape(
                url=url,
                prompt=prompt,
                schema=schema
            )
            
            elapsed = (datetime.now() - start_time).total_seconds()
            
            # Normalize result to dict when possible
            if not isinstance(result, dict):
                # Try to coerce object-like result
                try:
                    result = result.model_dump()
                except Exception:
                    try:
                        result = dict(result)
                    except Exception:
                        result = result

            # OpenPull returns a dict-like object, check for error key
            if isinstance(result, dict):
                import json

                logger.info(f"OpenPull raw keys: {list(result.keys())}")
                error = result.get("error")
                if error:
                    logger.error(f"OpenPull returned error: {error}")
                    return ExtractionResult(
                        success=False,
                        url=url,
                        error=str(error),
                        processing_time=elapsed
                    )

                # Extract data: prefer explicit "data" if present, otherwise keep all useful keys
                extracted_data = result.get("data")
                if extracted_data is None:
                    extracted_data = {
                        k: v for k, v in result.items()
                        if k not in ("markdown", "content", "error") and not k.startswith("_")
                    }

                raw_content = result.get("markdown") or result.get("content", "")
                main_content = result.get("main_content")
                if main_content is not None:
                    # Ensure main_content is preserved for callers
                    if isinstance(extracted_data, dict):
                        extracted_data.setdefault("main_content", main_content)
                    if not raw_content:
                        # Convert block structure to readable text
                        lines = []
                        if isinstance(main_content, list):
                            for block in main_content:
                                if isinstance(block, dict):
                                    for key in ("title", "text", "heading"):
                                        if block.get(key):
                                            lines.append(str(block[key]))
                                    if block.get("items"):
                                        lines.extend([str(item) for item in block["items"]])
                                elif isinstance(block, str):
                                    lines.append(block)
                        elif isinstance(main_content, str):
                            lines.append(main_content)
                        if lines:
                            raw_content = "\n".join(lines)

                if (not raw_content) and extracted_data is not None:
                    try:
                        raw_content = json.dumps(extracted_data)
                    except Exception:
                        raw_content = str(extracted_data)

                if not raw_content:
                    # Last resort: serialize full result dict so callers get something non-empty
                    try:
                        raw_content = json.dumps(result)
                    except Exception:
                        raw_content = str(result)

                logger.info(
                    f"OpenPull parsed: raw_len={len(raw_content) if raw_content else 0}, "
                    f"has_main_content={main_content is not None}, "
                    f"data_keys={list(extracted_data.keys()) if isinstance(extracted_data, dict) else 'n/a'}"
                )

                return ExtractionResult(
                    success=True,
                    url=url,
                    extracted_data=extracted_data,
                    raw_content=raw_content,
                    processing_time=elapsed
                )
            else:
                import json
                # Handle object result (backwards compatibility)
                error = getattr(result, "error", None)
                if error:
                    logger.error(f"OpenPull returned error: {error}")
                    return ExtractionResult(
                        success=False,
                        url=url,
                        error=str(error),
                        processing_time=elapsed
                    )
                extracted_data = getattr(result, "data", None)
                main_content = getattr(result, "main_content", None)
                if extracted_data is None:
                    try:
                        extracted_data = {
                            k: v for k, v in result.__dict__.items()
                            if k not in ("markdown", "content", "error") and not k.startswith("_")
                        }
                    except Exception:
                        extracted_data = None
                raw_content = getattr(result, "markdown", None) or getattr(result, "content", "")
                if main_content is not None:
                    if isinstance(extracted_data, dict):
                        extracted_data.setdefault("main_content", main_content)
                    if not raw_content:
                        lines = []
                        if isinstance(main_content, list):
                            for block in main_content:
                                if isinstance(block, dict):
                                    for key in ("title", "text", "heading"):
                                        if block.get(key):
                                            lines.append(str(block[key]))
                                    if block.get("items"):
                                        lines.extend([str(item) for item in block["items"]])
                                elif isinstance(block, str):
                                    lines.append(block)
                        elif isinstance(main_content, str):
                            lines.append(main_content)
                        if lines:
                            raw_content = "\n".join(lines)
                if (not raw_content) and extracted_data is not None:
                    try:
                        raw_content = json.dumps(extracted_data)
                    except Exception:
                        raw_content = str(extracted_data)
                if not raw_content:
                    try:
                        raw_content = json.dumps(result.__dict__)
                    except Exception:
                        raw_content = str(result)
                logger.info(
                    f"OpenPull parsed (obj): raw_len={len(raw_content) if raw_content else 0}, "
                    f"has_main_content={main_content is not None}, "
                    f"data_keys={list(extracted_data.keys()) if isinstance(extracted_data, dict) else 'n/a'}"
                )
                return ExtractionResult(
                    success=True,
                    url=url,
                    extracted_data=extracted_data,
                    raw_content=raw_content,
                    processing_time=elapsed
                )
            
        except Exception as e:
            elapsed = (datetime.now() - start_time).total_seconds()
            return ExtractionResult(
                success=False,
                url=url,
                error=str(e),
                processing_time=elapsed
            )

