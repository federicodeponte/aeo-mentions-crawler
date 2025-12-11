"""
Modal deployment for AEO Checks - Unified API Gateway

All AEO-related services in one Modal app:
- /company/* - Company analysis (AI + GPT-4o-mini logo detection)
- /health/* - Website health check (31 checks across 4 categories)
- /mentions/* - AEO mentions check (5 AI platforms with search grounding)

Endpoint: https://clients--aeo-checks-fastapi-app.modal.run

v4: Added Playwright for JS rendering + Cloudflare detection

Usage:
    modal deploy modal_deploy.py
    
Test:
    curl https://clients--aeo-checks-fastapi-app.modal.run/status
"""

import modal
from pathlib import Path

app = modal.App("aeo-checks")
local_dir = Path(__file__).parent

# Build image with all dependencies including Playwright for JS rendering
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        # Cairo for SVG conversion (logo detection)
        "libcairo2-dev",
        "libffi-dev",
        # Fonts for image processing
        "fonts-liberation",
        # Git for installing packages from GitHub
        "git",
    )
    .pip_install(
        # Core
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
        "pydantic>=2.5.0",
        "httpx>=0.25.0",
        # HTML parsing
        "beautifulsoup4>=4.12.0",
        "lxml>=4.9.0",
        # Image processing
        "Pillow>=10.0.0",
        "cairosvg>=2.7.0",
        # OpenRouter direct calls
        "openai>=1.12.0",
        # Google GenAI
        "google-genai>=0.2.0",
        "google-auth>=2.23.0",
        # SERP calls
        "requests>=2.31.0",
        # Playwright for JS rendering
        "playwright>=1.40.0",
    )
    # Install Playwright browser (Chromium) with dependencies
    .run_commands(
        "playwright install chromium --with-deps",
    )
    # Add all service modules
    .add_local_python_source("main")
    .add_local_python_source("company_service")
    .add_local_python_source("health_service")
    .add_local_python_source("mentions_service")
    # Shared modules
    .add_local_python_source("tech_detector")
    # logo_detector removed - now using openlogo package
    .add_local_python_source("fetcher")
    .add_local_python_source("scoring")
    # Local OpenPull implementation
    .add_local_python_source("openpull")
    # New Local Services
    .add_local_python_source("ai_client")
    .add_local_python_source("openrouter_client")
    .add_local_python_source("tool_executor")
    .add_local_python_source("url_extractor")
    .add_local_python_source("serp_types")
    .add_local_python_source("serp_dataforseo")
    # Health check modules
    .add_local_dir(local_dir / "checks", remote_path="/root/checks")
)


@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("openai-api-key"),  # For logo detection (GPT-4o-mini)
        modal.Secret.from_name("openrouter-api-key"), # For AI calls
        modal.Secret.from_name("serp-credentials"),   # For SERP/DataForSEO
    ],
    timeout=600,  # Increased for company analysis with multiple AI calls
    min_containers=20,  # Keep 20 containers warm for instant parallel processing
    max_containers=200,  # Allow up to 200 containers for maximum parallelism
    memory=2048,  # 2GB memory for better performance
)
@modal.concurrent(max_inputs=10)  # Process 10 requests per container concurrently
@modal.asgi_app()
def fastapi_app():
    """Serve the unified AEO Checks FastAPI application."""
    import sys
    sys.path.insert(0, "/root")
    
    from main import app
    return app


@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("openai-api-key"),  # For logo detection
        modal.Secret.from_name("openrouter-api-key"), # For AI calls
        modal.Secret.from_name("serp-credentials"),   # For SERP/DataForSEO
    ],
    timeout=900,  # 15 minutes for full analysis
)
async def run_company_analysis_background(
    website_url: str,
    company_name: str,
    client_id: str,
    supabase_url: str,
    supabase_key: str,
    additional_context: str = None,
    trigger_mentions_check: bool = False,
    mentions_check_params: dict = None,
):
    """Background Modal function for company analysis - runs independently."""
    import sys
    sys.path.insert(0, "/root")
    import httpx
    
    from company_service import (
        CompanyAnalysisRequest,
        _analyze_internal,
        CompanyAnalysisResponse,
        save_to_supabase,
        trigger_mentions_check as trigger_mentions,
        get_domain,
        logger,
    )
    
    domain = get_domain(website_url)
    logger.info(f"Background function started for {domain}")
    
    try:
        # Build request object
        request = CompanyAnalysisRequest(
            website_url=website_url,
            company_name=company_name,
            client_id=client_id,
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            additional_context=additional_context,
            trigger_mentions_check=trigger_mentions_check,
            mentions_check_params=mentions_check_params,
        )
        
        # Run analysis
        result = await _analyze_internal(request, domain)
        
        # Save to DB
        response = CompanyAnalysisResponse(**result) if isinstance(result, dict) else result
        saved = await save_to_supabase(
            supabase_url,
            supabase_key,
            client_id,
            response,
        )
        
        # Update status
        status = "completed" if saved else "failed"
        async with httpx.AsyncClient(timeout=10) as client:
            await client.patch(
                f"{supabase_url}/rest/v1/clients?id=eq.{client_id}",
                json={"analysis_status": status},
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Content-Type": "application/json",
                }
            )
        
        logger.info(f"Background analysis complete for {domain}: status={status}")
        
        # Trigger mentions check if requested
        if trigger_mentions_check and mentions_check_params and saved:
            await trigger_mentions(
                supabase_url,
                supabase_key,
                company_name,
                client_id,
                mentions_check_params,
            )
            
        return {"status": status, "client_id": client_id}
        
    except Exception as e:
        logger.error(f"Background analysis failed for {domain}: {e}")
        # Update status to failed
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.patch(
                    f"{supabase_url}/rest/v1/clients?id=eq.{client_id}",
                    json={"analysis_status": "failed"},
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                    }
                )
        except:
            pass
        return {"status": "failed", "error": str(e)}


# Local entrypoint for testing
@app.local_entrypoint()
def main():
    """Test the deployment locally."""
    print("\n🚀 AEO Checks - Unified API Gateway")
    print("=" * 60)
    print("\nServices included:")
    print("  • /company/* - Company analysis")
    print("  • /health/*  - Website health check (30 checks)")
    print("  • /mentions/* - AEO mentions check (5 AI platforms)")
    print("\nEndpoint: https://clients--aeo-checks-fastapi-app.modal.run")
    print("\nTest with:")
    print('  curl https://clients--aeo-checks-fastapi-app.modal.run/status')
    print("\n" + "=" * 60)

