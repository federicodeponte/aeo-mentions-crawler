"""
AEO Services - Unified API Gateway for AEO Analysis

All AEO-related services in one Modal app:
- /company/* - Company analysis (Gemini + GPT-4o-mini logo detection)
- /health/* - Website health check (30 checks across 4 categories)
- /mentions/* - AEO mentions check (5 AI platforms with search grounding)

Endpoint: https://clients--aeo-checks-fastapi-app.modal.run
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Main app
app = FastAPI(
    title="AEO Services",
    description="Unified API gateway for AEO analysis services",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Service directory."""
    return {
        "service": "aeo-checks",
        "version": "1.0.0",
        "endpoints": {
            # Company Analysis
            "/company/analyze": "POST - Full company analysis with logo detection",
            "/company/crawl-logo": "POST - Standalone logo detection",
            "/company/health": "GET - Company analysis service health",
            # Health Check
            "/health/check": "POST - Website AEO health check (30 checks)",
            "/health/health": "GET - Health check service status",
            # Mentions Check
            "/mentions/check": "POST - AEO mentions check across AI platforms",
            "/mentions/health": "GET - Mentions check service status",
            # Gateway
            "/status": "GET - Gateway status with all service health",
        }
    }


@app.get("/status")
async def gateway_status():
    """Gateway health check with service status."""
    return {
        "status": "healthy",
        "service": "aeo-checks",
        "version": "1.0.0",
        "services": {
            "company": "operational",
            "health": "operational",
            "mentions": "operational",
        }
    }


# Mount Company Analysis service under /company
from company_service import app as company_app
app.mount("/company", company_app)

# Mount Health Check service under /health
from health_service import app as health_app
app.mount("/health", health_app)

# Mount Mentions Check service under /mentions
from mentions_service import app as mentions_app
app.mount("/mentions", mentions_app)

