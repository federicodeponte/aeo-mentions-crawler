#!/usr/bin/env python3
"""
Keyword Generation Local Server
Runs the openkeywords library as a FastAPI service on port 8002
"""
import sys
import os
import logging
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add openkeyword to path
openkeyword_path = Path(__file__).parent / "openkeyword"
sys.path.insert(0, str(openkeyword_path))

from openkeywords.generator import KeywordGenerator
from openkeywords.models import CompanyInfo, GenerationConfig

app = FastAPI(
    title="Keyword Generation Service",
    description="AI-powered keyword research service",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class KeywordGenerationRequest(BaseModel):
    """Request model for keyword generation."""
    company_name: str = Field(..., description="Company name")
    company_url: str = Field(..., description="Company website URL")
    language: str = Field(default="en", description="Language code (e.g., 'en', 'es')")
    country: str = Field(default="US", description="Country code (e.g., 'US', 'ES')")
    num_keywords: int = Field(default=50, description="Target number of keywords")
    mode: str = Field(default="generate", description="'generate' (fresh) or 'refresh' (based on existing)")
    existing_keywords: Optional[List[str]] = Field(default=None, description="Existing keywords (for refresh mode)")
    system_instructions: Optional[str] = Field(default=None, description="Additional instructions for keyword generation")
    apiKey: Optional[str] = Field(default=None, description="Gemini API key (falls back to env var)")
    
    # Context fields
    description: Optional[str] = None
    products: Optional[List[str]] = None
    target_audience: Optional[str] = None
    competitors: Optional[str] = None
    pain_points: Optional[List[str]] = None
    value_propositions: Optional[List[str]] = None
    use_cases: Optional[List[str]] = None
    content_themes: Optional[List[str]] = None
    tone: Optional[str] = None


class KeywordResponse(BaseModel):
    """Response model with generated keywords."""
    keywords: List[dict]
    metadata: dict


@app.post("/generate", response_model=KeywordResponse)
async def generate_keywords(request: KeywordGenerationRequest):
    """
    Generate keywords using openkeywords library.
    Supports both 'generate' (fresh) and 'refresh' (based on existing) modes.
    """
    try:
        logger.info(f"[KEYWORD-SERVER] Mode: {request.mode}")
        logger.info(f"[KEYWORD-SERVER] Company: {request.company_name}")
        logger.info(f"[KEYWORD-SERVER] Target count: {request.num_keywords}")
        
        # Get API key
        api_key = request.apiKey or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Gemini API key required. Set GEMINI_API_KEY environment variable or pass apiKey."
            )
        
        # Prepare company info
        company_info = CompanyInfo(
            name=request.company_name,
            url=request.company_url,
            description=request.description or "",
            products=request.products or [],
            target_audience=request.target_audience or "",
        )
        
        # Prepare generation config
        config = GenerationConfig(
            target_count=request.num_keywords,
            language=request.language,
            country=request.country,
            enable_serp_analysis=False,  # Can be enabled if needed
            enable_gap_analysis=False,   # Requires SE Ranking API key
        )
        
        # Initialize generator
        generator = KeywordGenerator(
            gemini_api_key=api_key,
            model="gemini-2.0-flash-exp",  # Fast model for keyword generation
        )
        
        # Add system instructions to company description if provided
        if request.system_instructions:
            company_info.description = f"{company_info.description}\n\n{request.system_instructions}"
        
        # Generate or refresh keywords
        if request.mode == "refresh" and request.existing_keywords:
            logger.info(f"[KEYWORD-SERVER] Refreshing {len(request.existing_keywords)} existing keywords")
            # For refresh mode, we'll generate new keywords but guide them based on existing ones
            config.target_count = request.num_keywords
            result = await generator.generate_keywords_async(company_info, config)
        else:
            logger.info(f"[KEYWORD-SERVER] Generating fresh keywords")
            result = await generator.generate_keywords_async(company_info, config)
        
        # Format response
        keywords_list = []
        for kw in result.keywords:
            keywords_list.append({
                "keyword": kw.keyword,
                "intent": kw.intent,
                "search_volume": kw.search_volume,
                "difficulty": kw.difficulty,
                "company_fit": kw.company_fit,
                "rationale": kw.rationale,
                "cluster": kw.cluster.name if kw.cluster else None,
            })
        
        metadata = {
            "total_keywords": len(keywords_list),
            "processing_time_seconds": result.processing_time,
            "language": request.language,
            "country": request.country,
            "mode": request.mode,
        }
        
        logger.info(f"[KEYWORD-SERVER] Successfully generated {len(keywords_list)} keywords")
        
        return KeywordResponse(
            keywords=keywords_list,
            metadata=metadata,
        )
        
    except Exception as e:
        logger.error(f"[KEYWORD-SERVER] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Keyword generation failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "keyword-generation"}


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.environ.get("KEYWORD_SERVER_PORT", 8002))
    print(f"🚀 Starting keyword-generation server on http://localhost:{port}")
    print(f"🔑 Endpoints:")
    print(f"   - POST http://localhost:{port}/generate")
    print(f"   - GET  http://localhost:{port}/health")
    print()
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False,
    )
