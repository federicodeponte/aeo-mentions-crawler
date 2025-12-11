# ABOUTME: DataForSEO provider for premium SERP data with rich features
# ABOUTME: Paid service at $0.50/1K queries - includes featured snippets, PAA, related searches

import base64
import logging
from typing import Optional

import httpx

from serp_types import (
    SearchResult,
    SerpResponse,
    AuthenticationError,
    InvalidRequestError,
    NetworkError,
)

logger = logging.getLogger(__name__)


# DataForSEO location codes for common countries
LOCATION_CODES = {
    "us": 2840,  # United States
    "uk": 2826,  # United Kingdom
    "gb": 2826,  # United Kingdom (alt)
    "ca": 2124,  # Canada
    "au": 2036,  # Australia
    "de": 2276,  # Germany
    "fr": 2250,  # France
    "es": 2724,  # Spain
    "it": 2380,  # Italy
    "jp": 2392,  # Japan
    "br": 2076,  # Brazil
    "in": 2356,  # India
    "mx": 2484,  # Mexico
    "nl": 2528,  # Netherlands
    "se": 2752,  # Sweden
    "pl": 2616,  # Poland
    "ch": 2756,  # Switzerland
    "at": 2040,  # Austria
    "be": 2056,  # Belgium
}


class DataForSeoProvider:
    """DataForSEO provider for premium SERP data.

    Provides rich search results including:
    - Organic results with ratings, prices
    - Featured snippets
    - People Also Ask
    - Related searches

    Cost: $0.50 per 1,000 queries
    Latency: ~200-800ms
    """

    BASE_URL = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced"

    def __init__(self, api_login: str, api_password: str):
        """Initialize DataForSEO provider.

        Args:
            api_login: DataForSEO API login (email)
            api_password: DataForSEO API password
        """
        self.name = "dataforseo"
        self.cost_per_1k = 0.50
        self.api_login = api_login
        self.api_password = api_password

    def is_configured(self) -> bool:
        """Check if provider is properly configured."""
        return bool(self.api_login and self.api_password)

    async def search(
        self,
        query: str,
        num_results: int = 10,
        language: str = "en",
        country: str = "us",
    ) -> SerpResponse:
        """Execute search query through DataForSEO.

        Args:
            query: Search query string
            num_results: Number of results (max 100)
            language: Language code (default: "en")
            country: Country code (default: "us")

        Returns:
            SerpResponse with search results and rich features
        """
        if not self.is_configured():
            return SerpResponse(
                success=False,
                query=query,
                results=[],
                provider=self.name,
                error="DataForSEO credentials not configured",
            )

        if not query:
            return SerpResponse(
                success=False,
                query=query,
                results=[],
                provider=self.name,
                error="Query parameter is required",
            )

        if len(query) > 2048:
            return SerpResponse(
                success=False,
                query=query,
                results=[],
                provider=self.name,
                error="Query too long (max 2048 characters)",
            )

        # Cap at 100 (DataForSEO max)
        num_results = min(num_results, 100)

        try:
            # Create HTTP Basic Auth header
            credentials = f"{self.api_login}:{self.api_password}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            auth_header = f"Basic {encoded_credentials}"

            location_code = LOCATION_CODES.get(country.lower(), 2840)

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.BASE_URL,
                    json=[
                        {
                            "keyword": query,
                            "location_code": location_code,
                            "language_code": language,
                            "depth": num_results,
                            "calculate_rectangles": False,
                        }
                    ],
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json",
                    },
                )

                if response.status_code in (401, 403):
                    return SerpResponse(
                        success=False,
                        query=query,
                        results=[],
                        provider=self.name,
                        error="DataForSEO authentication failed",
                    )
                elif response.status_code == 400:
                    return SerpResponse(
                        success=False,
                        query=query,
                        results=[],
                        provider=self.name,
                        error=f"Invalid request: {response.text}",
                    )

                response.raise_for_status()
                data = response.json()

                # DataForSEO returns tasks array
                if not data or "tasks" not in data or not data["tasks"]:
                    return SerpResponse(
                        success=False,
                        query=query,
                        results=[],
                        provider=self.name,
                        error="Invalid response structure",
                    )

                task_result = data["tasks"][0]
                if task_result.get("status_code") != 20000:
                    error_msg = task_result.get("status_message", "Unknown error")
                    return SerpResponse(
                        success=False,
                        query=query,
                        results=[],
                        provider=self.name,
                        error=f"Task failed: {error_msg}",
                    )

                result_data = task_result.get("result", [])
                if not result_data:
                    return SerpResponse(
                        success=False,
                        query=query,
                        results=[],
                        provider=self.name,
                        error="No results in response",
                    )

                return self._parse_response(result_data[0], query)

        except httpx.TimeoutException:
            return SerpResponse(
                success=False,
                query=query,
                results=[],
                provider=self.name,
                error="DataForSEO request timeout after 30s",
            )
        except httpx.HTTPStatusError as e:
            return SerpResponse(
                success=False,
                query=query,
                results=[],
                provider=self.name,
                error=f"HTTP error: {e.response.status_code}",
            )
        except Exception as e:
            logger.error(f"DataForSEO error: {e}", exc_info=True)
            return SerpResponse(
                success=False,
                query=query,
                results=[],
                provider=self.name,
                error=f"DataForSEO error: {str(e)}",
            )

    def _parse_response(self, data: dict, query: str) -> SerpResponse:
        """Parse DataForSEO response into standardized format.

        Args:
            data: Raw DataForSEO response
            query: Original search query

        Returns:
            SerpResponse with parsed results and rich features
        """
        items = data.get("items", [])
        results = []
        featured_snippet = None
        people_also_ask = []
        related_searches = []

        for item in items:
            item_type = item.get("type", "")

            # Organic results
            if item_type == "organic":
                results.append(SearchResult(
                    position=item.get("rank_absolute", 0),
                    title=item.get("title", ""),
                    link=item.get("url", ""),
                    snippet=item.get("description", ""),
                    displayed_link=item.get("breadcrumb", ""),
                    engine="google",
                ))

            # Featured snippet
            elif item_type == "featured_snippet" and not featured_snippet:
                featured_snippet = {
                    "title": item.get("title"),
                    "snippet": item.get("description"),
                    "link": item.get("url"),
                }

            # People Also Ask
            elif item_type == "people_also_ask":
                paa_items = item.get("items", [])
                for paa in paa_items:
                    people_also_ask.append({
                        "question": paa.get("title"),
                        "snippet": paa.get("description"),
                        "link": paa.get("url"),
                    })

            # Related searches
            elif item_type == "related_searches":
                rs_items = item.get("items", [])
                for rs in rs_items:
                    if isinstance(rs, str):
                        related_searches.append({"query": rs})
                    elif isinstance(rs, dict):
                        related_searches.append({"query": rs.get("title")})

        # Cost: $0.50 per 1,000 queries = $0.0005 per query
        cost = 0.0005

        return SerpResponse(
            success=True,
            query=query,
            results=results,
            provider=self.name,
            cost=cost,
            featured_snippet=featured_snippet,
            people_also_ask=people_also_ask,
            related_searches=related_searches,
            total_results=len(results),
        )
