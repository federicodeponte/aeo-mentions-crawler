# ABOUTME: SERP service type definitions and base classes
# ABOUTME: Defines common types for search results, providers, and errors

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional
from datetime import datetime


class SerpProvider(str, Enum):
    """Available SERP providers."""
    SEARXNG = "searxng"
    DATAFORSEO = "dataforseo"
    AUTO = "auto"  # Auto-select based on availability/cost


@dataclass
class SearchResult:
    """Single search result."""
    position: int
    title: str
    link: str
    snippet: str
    displayed_link: str = ""
    engine: str = ""  # For SearXNG: which engine provided this


@dataclass
class SerpResponse:
    """Standardized SERP response across providers."""
    success: bool
    query: str
    results: list[SearchResult]
    provider: str
    cost: float = 0.0
    cached: bool = False
    error: Optional[str] = None

    # Rich SERP features (DataForSEO provides these)
    featured_snippet: Optional[dict] = None
    people_also_ask: list[dict] = field(default_factory=list)
    related_searches: list[dict] = field(default_factory=list)

    # Metadata
    total_results: int = 0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "success": self.success,
            "query": self.query,
            "results": [
                {
                    "position": r.position,
                    "title": r.title,
                    "link": r.link,
                    "snippet": r.snippet,
                    "displayed_link": r.displayed_link,
                    "engine": r.engine,
                }
                for r in self.results
            ],
            "provider": self.provider,
            "cost": self.cost,
            "cached": self.cached,
            "error": self.error,
            "featured_snippet": self.featured_snippet,
            "people_also_ask": self.people_also_ask,
            "related_searches": self.related_searches,
            "total_results": self.total_results,
            "timestamp": self.timestamp,
        }


@dataclass
class ProviderConfig:
    """Configuration for a SERP provider."""
    name: str
    priority: int  # Lower = higher priority
    cost_per_1k: float
    enabled: bool = True
    daily_limit: Optional[int] = None
    monthly_limit: Optional[int] = None


class SerpError(Exception):
    """Base SERP error."""
    def __init__(self, message: str, provider: str = "", is_retryable: bool = False):
        super().__init__(message)
        self.provider = provider
        self.is_retryable = is_retryable


class AuthenticationError(SerpError):
    """API key or credentials invalid."""
    pass


class RateLimitError(SerpError):
    """Rate limit exceeded."""
    def __init__(self, message: str, provider: str = "", retry_after: Optional[int] = None):
        super().__init__(message, provider, is_retryable=True)
        self.retry_after = retry_after


class NetworkError(SerpError):
    """Network/HTTP error."""
    def __init__(self, message: str, provider: str = ""):
        super().__init__(message, provider, is_retryable=True)


class InvalidRequestError(SerpError):
    """Invalid request parameters."""
    pass
