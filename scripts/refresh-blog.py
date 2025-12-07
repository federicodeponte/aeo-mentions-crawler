#!/usr/bin/env python3
"""
Blog refresh script for local development
Calls the content refresher from blog-writer service
"""

import sys
import json
import os
import asyncio
from pathlib import Path

# Add blog-writer to path
blog_writer_path = Path(__file__).parent.parent.parent / 'services' / 'blog-writer'
sys.path.insert(0, str(blog_writer_path))

from service.content_refresher import ContentParser, ContentRefresher
from pipeline.models.gemini_client import GeminiClient


async def refresh_blog(input_data: dict) -> dict:
    """Refresh blog content using ContentRefresher."""
    try:
        content = input_data.get('content', '')
        content_format = input_data.get('content_format')
        instructions = input_data.get('instructions', [])
        target_sections = input_data.get('target_sections')
        output_format = input_data.get('output_format', 'html')
        include_diff = input_data.get('include_diff', False)
        api_key = input_data.get('api_key')

        if not api_key:
            api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')

        if not api_key:
            return {
                "success": False,
                "error": "API key is required",
            }

        # Set API key
        os.environ['GEMINI_API_KEY'] = api_key

        # Parse content
        parser = ContentParser()
        parsed_content = parser.parse(content, content_format)

        # Initialize Gemini client and refresher
        gemini_client = GeminiClient(api_key=api_key)
        refresher = ContentRefresher(gemini_client)

        # Refresh content
        refreshed_content = await refresher.refresh_content(
            content=parsed_content,
            instructions=instructions,
            target_sections=target_sections,
        )

        # Count updated sections
        sections_updated = (
            len(target_sections) if target_sections else len(refreshed_content.get('sections', []))
        )

        # Build response
        result = {
            "success": True,
            "refreshed_content": refreshed_content,
            "sections_updated": sections_updated,
        }

        # Generate diff if requested
        if include_diff:
            diff_text, diff_html = refresher.generate_diff(parsed_content, refreshed_content)
            result["diff_text"] = diff_text
            result["diff_html"] = diff_html

        # Format output
        if output_format == "html":
            result["refreshed_html"] = refresher.to_html(refreshed_content)
        elif output_format == "markdown":
            result["refreshed_markdown"] = refresher.to_markdown(refreshed_content)

        return result

    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc(),
        }


def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        # Run async refresh
        result = asyncio.run(refresh_blog(input_data))

        # Output result to stdout
        print(json.dumps(result))
        sys.exit(0 if result.get("success") else 1)

    except Exception as e:
        import traceback
        error_output = {
            "success": False,
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

