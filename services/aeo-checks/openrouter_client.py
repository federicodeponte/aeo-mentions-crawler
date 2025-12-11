"""
OpenRouter Client - Canonical AI Gateway for all Modal services

Version: 2.0.1 (Dec 4, 2025) - Provider routing via extra_body

This is the SINGLE source of truth for OpenRouter/AI calls across:
- scaile-services (direct usage)
- aeo-checks (calls /ai/generate endpoint)
- blog-writer (calls /ai/generate endpoint)
- keyword-generation (calls /ai/generate endpoint)

Features:
- Full tool execution loop (google_search via SERP, url_context via URL service)
- Automatic tool call handling with multi-iteration support
- Integration with scaile-services internal endpoints (SERP, URL extraction)
- Provider routing support (e.g., force openai instead of azure for gpt-4.1)
- 5 minute timeout for long-running operations (blog generation)
"""

import os
import json
import logging
import httpx
from typing import Dict, Any, Optional, List

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# Import local tool executor
from tool_executor import ToolExecutor

# Initialize tool executor (will be set in __init__)
_tool_executor = None

class OpenRouterClient:
    """OpenRouter client using OpenAI SDK - proven working implementation"""
    
    def __init__(self, api_key: Optional[str] = None):
        global _tool_executor
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY is required")
        
        # Use OpenAI SDK with OpenRouter base URL (proven working approach)
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
            timeout=300.0,  # 5 min - blog generation with tools takes 2-4 min
            max_retries=3,
        )
        
        # Tool executor will be initialized lazily when needed
        self._tool_executor = None
    
    def _get_tool_executor(self):
        """Get tool executor instance (lazy initialization)."""
        global _tool_executor
        if _tool_executor is None:
            try:
                _tool_executor = ToolExecutor()
                logger.info("ToolExecutor initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize ToolExecutor: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                raise
        return _tool_executor
    
    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: str = "google/gemini-3-pro-preview",
        max_tokens: Optional[int] = None,
        tools: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate completion using OpenRouter via OpenAI SDK
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (e.g., 'google/gemini-3-pro-preview')
            max_tokens: Maximum tokens to generate (optional, let model decide if not set)
            tools: List of tools to enable ('google_search', 'url_context')
            **kwargs: Additional OpenAI-compatible parameters
        """
        
        # Prepare request parameters - only include max_tokens if provided
        # Extract provider from kwargs (needs to go in extra_body for OpenRouter)
        provider = kwargs.pop("provider", None)
        
        params = {
            "model": model,
            "messages": messages,
            **kwargs
        }
        if max_tokens is not None:
            params["max_tokens"] = max_tokens
        
        # Add provider to extra_body if specified (OpenRouter-specific)
        if provider:
            params["extra_body"] = {"provider": provider}
        
        # Add tools if specified (using OpenAI SDK format)
        if tools:
            tool_configs = []
            for tool in tools:
                if tool == "google_search":
                    tool_configs.append({
                        "type": "function",
                        "function": {
                            "name": "google_search",
                            "description": "Search Google for current information",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "query": {
                                        "type": "string",
                                        "description": "Search query"
                                    }
                                },
                                "required": ["query"]
                            }
                        }
                    })
                elif tool == "url_context":
                    tool_configs.append({
                        "type": "function", 
                        "function": {
                            "name": "url_context",
                            "description": "Get content from a URL",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "url": {
                                        "type": "string",
                                        "description": "URL to fetch content from"
                                    }
                                },
                                "required": ["url"]
                            }
                        }
                    })
            
            if tool_configs:
                params["tools"] = tool_configs
        
        try:
            # Use OpenAI SDK chat completions (works with OpenRouter)
            response = await self.client.chat.completions.create(**params)
            
            # Convert to dict for consistent interface
            result = response.model_dump()
            
            # Debug logging
            logger.info(f"OpenRouter response via OpenAI SDK: {result}")
            
            return result
                
        except Exception as e:
            logger.error(f"OpenRouter request failed: {e}")
            raise
    
    async def generate_simple(
        self,
        prompt: str,
        model: str = "google/gemini-3-pro-preview",
        max_tokens: int = 1000,
        tools: Optional[List[str]] = None
    ) -> str:
        """Simple text generation helper"""
        
        messages = [{"role": "user", "content": prompt}]
        result = await self.complete(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            tools=tools
        )
        
        return result["choices"][0]["message"]["content"]
    
    async def health_check(self) -> Dict[str, Any]:
        """Check OpenRouter API health"""
        try:
            # Simple test completion with a known working model
            result = await self.complete(
                messages=[{"role": "user", "content": "Hi"}],
                model="openai/gpt-4o-mini",  # Use a model that definitely exists on OpenRouter
                max_tokens=10
            )
            
            return {
                "status": "healthy",
                "api_accessible": True,
                "test_completion": True,
                "test_model": "openai/gpt-4o-mini"
            }
        except Exception as e:
            return {
                "status": "error",
                "api_accessible": False,
                "error": str(e)
            }
    
    # ==================== Tool Execution Methods ====================
    
    def _get_tool_configs(self, tools: List[str]) -> List[Dict[str, Any]]:
        """Get OpenAI-compatible tool configurations."""
        tool_configs = []
        
        for tool in tools:
            if tool == "google_search":
                tool_configs.append({
                    "type": "function",
                    "function": {
                        "name": "google_search",
                        "description": "Search the web for current information. Use this when you need real-time data, recent news, or facts you're not certain about.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The search query to look up"
                                }
                            },
                            "required": ["query"]
                        }
                    }
                })
            elif tool == "url_context":
                tool_configs.append({
                    "type": "function", 
                    "function": {
                        "name": "url_context",
                        "description": "Extract and read content from a specific URL. Use this to get detailed information from a webpage.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "url": {
                                    "type": "string",
                                    "description": "The full URL to extract content from (must start with http:// or https://)"
                                }
                            },
                            "required": ["url"]
                        }
                    }
                })
        
        return tool_configs
    
    async def _execute_tool(self, tool_call: Dict[str, Any]) -> str:
        """Execute a tool call using local ToolExecutor."""
        function = tool_call.get("function", {})
        tool_name = function.get("name", "")
        
        try:
            args_str = function.get("arguments", "{}")
            args = json.loads(args_str) if isinstance(args_str, str) else args_str
        except json.JSONDecodeError:
            logger.error(f"Failed to parse tool arguments: {args_str}")
            return f"Error: Invalid tool arguments"
        
        logger.info(f"Executing tool: {tool_name} with args: {args}")
        
        # Use local tool executor (lazy initialization)
        return await self._get_tool_executor().execute(tool_name, args)
    
    async def complete_with_tools(
        self,
        messages: List[Dict[str, Any]],
        model: str = "google/gemini-3-pro-preview",
        tools: Optional[List[str]] = None,
        max_iterations: int = 5,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate completion with full tool execution loop.
        
        This method handles the complete tool calling cycle:
        1. Send request to model with tool definitions
        2. If model requests tool calls, execute them
        3. Send tool results back to model
        4. Repeat until model returns final response or max iterations reached
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (e.g., 'google/gemini-3-pro-preview')
            tools: List of tools to enable ('google_search', 'url_context')
            max_iterations: Maximum number of tool execution iterations
            **kwargs: Additional OpenAI-compatible parameters (max_tokens, reasoning_effort, etc.)
            
        Returns:
            Final response dict with content and tool execution metadata
        """
        if not tools:
            # No tools requested, use simple completion
            return await self.complete(messages, model, tools=None, **kwargs)
        
        # Get tool configurations
        tool_configs = self._get_tool_configs(tools)
        
        # Track tool executions for metadata
        tool_executions = []
        working_messages = list(messages)  # Copy to avoid modifying original
        
        # Extract provider from kwargs once (needs to go in extra_body for OpenRouter)
        provider = kwargs.pop("provider", None)
        
        for iteration in range(max_iterations):
            logger.info(f"Tool loop iteration {iteration + 1}/{max_iterations}")
            
            # Prepare request parameters - max_tokens comes from kwargs if provided
            params = {
                "model": model,
                "messages": working_messages,
                "tools": tool_configs,
                **kwargs
            }
            
            # Add provider to extra_body if specified (OpenRouter-specific)
            if provider:
                params["extra_body"] = {"provider": provider}
            
            try:
                response = await self.client.chat.completions.create(**params)
                result = response.model_dump()
            except Exception as e:
                logger.error(f"OpenRouter request failed in tool loop: {e}")
                raise
            
            choice = result.get("choices", [{}])[0]
            message = choice.get("message", {})
            tool_calls = message.get("tool_calls")
            finish_reason = choice.get("finish_reason")
            
            # Check if model is done - prioritize tool_calls presence over finish_reason
            # Gemini 3 Pro returns finish_reason="stop" even when it has tool_calls
            if not tool_calls:
                logger.info(f"Tool loop completed after {iteration + 1} iterations (no tool calls)")
                result["_tool_executions"] = tool_executions
                result["_iterations"] = iteration + 1
                return result
            
            # Also exit if we hit length limit with no meaningful tool calls
            if finish_reason == "length" and not tool_calls:
                logger.warning(f"Tool loop hit length limit after {iteration + 1} iterations")
                result["_tool_executions"] = tool_executions
                result["_iterations"] = iteration + 1
                return result
            
            # Execute each tool call
            logger.info(f"Model requested {len(tool_calls)} tool calls")
            
            # Append assistant message with tool calls to conversation
            # For Gemini 3 Pro: must preserve reasoning and reasoning_details for thought signatures
            assistant_msg = {
                "role": "assistant",
                "content": message.get("content") or "",
                "tool_calls": tool_calls
            }
            # Preserve reasoning fields for Gemini 3 Pro thought signatures
            if message.get("reasoning"):
                assistant_msg["reasoning"] = message["reasoning"]
            if message.get("reasoning_details"):
                assistant_msg["reasoning_details"] = message["reasoning_details"]
            
            working_messages.append(assistant_msg)
            
            for tool_call in tool_calls:
                tool_id = tool_call.get("id", f"call_{len(tool_executions)}")
                
                # Execute the tool
                tool_result = await self._execute_tool(tool_call)
                
                # Track execution
                tool_executions.append({
                    "tool_id": tool_id,
                    "tool_name": tool_call.get("function", {}).get("name"),
                    "arguments": tool_call.get("function", {}).get("arguments"),
                    "result_preview": tool_result[:200] + "..." if len(tool_result) > 200 else tool_result
                })
                
                # Append tool result to conversation
                working_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_id,
                    "content": tool_result
                })
        
        # Max iterations reached
        logger.warning(f"Tool loop reached max iterations ({max_iterations})")
        result["_tool_executions"] = tool_executions
        result["_iterations"] = max_iterations
        result["_max_iterations_reached"] = True
        return result
    
    async def generate_with_tools(
        self,
        prompt: str,
        model: str = "google/gemini-3-pro-preview",
        tools: Optional[List[str]] = None,
        max_iterations: int = 5,
        max_retries: int = 3,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Simple helper for tool-enabled generation with retry for empty responses.
        
        Args:
            prompt: User prompt
            model: Model to use
            tools: List of tools ('google_search', 'url_context')
            max_iterations: Max tool execution iterations
            max_retries: Max retries for empty content (Gemini 3 Pro reasoning issue)
            **kwargs: Additional parameters (max_tokens, reasoning_effort, etc.)
            
        Returns:
            Dict with 'content', 'model', 'usage', and tool execution metadata
        """
        import asyncio
        
        messages = [{"role": "user", "content": prompt}]
        last_result = None
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # On retry for Gemini 3 Pro, use lower reasoning effort
                retry_kwargs = dict(kwargs)
                if attempt > 0 and "gemini-3" in model:
                    retry_kwargs["reasoning_effort"] = "low"
                    logger.info(f"Retry {attempt + 1}/{max_retries} with reasoning_effort=low")
                
                result = await self.complete_with_tools(
                    messages=messages,
                    model=model,
                    tools=tools,
                    max_iterations=max_iterations,
                    **retry_kwargs
                )
                
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                last_result = result
                
                # Success if we have content
                if content:
                    return {
                        "content": content,
                        "model": model,
                        "usage": result.get("usage"),
                        "tool_executions": result.get("_tool_executions", []),
                        "iterations": result.get("_iterations", 1),
                        "max_iterations_reached": result.get("_max_iterations_reached", False),
                        "retry_count": attempt
                    }
                
                # Empty content - log and retry
                logger.warning(f"Empty content on attempt {attempt + 1}/{max_retries}, retrying...")
                
            except Exception as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        # All retries exhausted - return last result or raise error
        if last_error and not last_result:
            raise last_error
        
        # Return last result even if empty
        logger.warning(f"All {max_retries} retries exhausted, returning last result")
        return {
            "content": last_result.get("choices", [{}])[0].get("message", {}).get("content", "") if last_result else "",
            "model": model,
            "usage": last_result.get("usage") if last_result else None,
            "tool_executions": last_result.get("_tool_executions", []) if last_result else [],
            "iterations": last_result.get("_iterations", 1) if last_result else 0,
            "max_iterations_reached": last_result.get("_max_iterations_reached", False) if last_result else False,
            "retry_count": max_retries - 1,
            "retries_exhausted": True
        }


# Global client instance
_client = None

def get_openrouter_client() -> OpenRouterClient:
    """Get shared OpenRouter client instance"""
    global _client
    if _client is None:
        logger.info("Initializing OpenRouterClient...")
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")
        logger.info(f"OPENROUTER_API_KEY found (length: {len(api_key)})")
        _client = OpenRouterClient()
        logger.info("OpenRouterClient initialized successfully")
    return _client