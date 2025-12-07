"""
Local Keyword Generator Server
Runs openkeyword locally with generate/refresh modes
"""

import sys
import os

# Add openkeyword to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'openkeyword'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Literal
import uvicorn

app = FastAPI(title="Keyword Generator Local Server", version="1.0.0")

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class KeywordRequest(BaseModel):
    company_name: str
    company_url: str
    company_description: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    products: Optional[List[str]] = None
    competitors: Optional[List[str]] = None
    language: str = "en"
    country: str = "US"
    target_count: int = 50
    mode: Literal["generate", "refresh"] = "generate"
    existing_keywords: Optional[List[str]] = None

class KeywordResult(BaseModel):
    keyword: str
    intent: str
    score: int
    cluster_name: Optional[str] = None
    is_question: bool
    source: str
    volume: Optional[int] = None
    difficulty: Optional[int] = None
    aeo_opportunity: Optional[int] = None

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "keyword-generator-local",
        "version": "1.0.0"
    }

@app.post("/generate")
async def generate_keywords(request: KeywordRequest):
    """
    Generate keywords using openkeyword
    
    Modes:
    - generate: Fresh keyword generation (default)
    - refresh: Regenerate based on existing keywords
    """
    try:
        from openkeywords import KeywordGeneratorV2, CompanyInfo, KeywordGenerationConfig
        
        # Initialize generator
        generator = KeywordGeneratorV2(
            google_api_key=os.getenv("GEMINI_API_KEY"),
            seranking_api_key=os.getenv("SERANKING_API_KEY")
        )
        
        # Build company info
        company_info = CompanyInfo(
            name=request.company_name,
            url=request.company_url,
            description=request.company_description,
            industry=request.industry,
            target_audience=request.target_audience,
            products=request.products or [],
            competitors=request.competitors or []
        )
        
        # Build config
        config = KeywordGenerationConfig(
            target_language=request.language,
            target_country=request.country,
            target_count=request.target_count,
        )
        
        # Generate keywords
        if request.mode == "refresh" and request.existing_keywords:
            # Refresh mode: use existing keywords as seed
            config.seed_keywords = request.existing_keywords
            result = await generator.refresh(
                company_info=company_info,
                existing_keywords=request.existing_keywords,
                config=config
            )
        else:
            # Generate mode: fresh generation
            result = await generator.generate(
                company_info=company_info,
                config=config
            )
        
        # Format response
        keywords = []
        for kw in result.keywords:
            keywords.append({
                "keyword": kw.keyword,
                "intent": kw.intent,
                "score": kw.score,
                "cluster_name": kw.cluster_name,
                "is_question": kw.is_question,
                "source": kw.source,
                "volume": kw.volume,
                "difficulty": kw.difficulty,
                "aeo_opportunity": getattr(kw, 'aeo_opportunity', None),
            })
        
        return {
            "keywords": keywords,
            "metadata": {
                "company_name": request.company_name,
                "company_url": request.company_url,
                "total_keywords": len(keywords),
                "mode": request.mode,
                "generation_time": result.generation_time
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Starting Keyword Generator Local Server on http://localhost:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")

