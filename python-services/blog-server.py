"""
Local Blog Writer Server
Runs the blog-writer pipeline locally without Modal
"""

import sys
import os

# Add blog-writer to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'blog-writer'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import asyncio
import uvicorn
from datetime import datetime

# Import blog-writer modules
from service.api import get_engine, BlogGenerationRequest, BlogGenerationResponse

app = FastAPI(title="Blog Writer Local Server", version="1.0.0")

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use the existing blog-writer engine
engine = None

@app.on_event("startup")
async def startup():
    global engine
    engine = get_engine()
    print("✅ Blog Writer engine initialized")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "blog-writer-local",
        "version": "1.0.0"
    }

@app.post("/generate", response_model=BlogGenerationResponse)
async def generate_blog(request: BlogGenerationRequest):
    """Generate a blog article using the 13-stage pipeline"""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    try:
        # Use the existing blog-writer API logic
        from service.api import generate_blog_endpoint
        result = await generate_blog_endpoint(request, engine)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-generate")
async def batch_generate(request: Dict[str, Any]):
    """Generate multiple blog articles"""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    keywords = request.get("keywords", [])
    results = []
    
    for kw_data in keywords:
        try:
            blog_request = BlogGenerationRequest(
                primary_keyword=kw_data["keyword"],
                company_url=request.get("company_url"),
                company_name=request.get("company_name"),
                target_word_count=kw_data.get("word_count", 1000),
                tone=request.get("tone", "professional"),
                language=request.get("language", "en"),
                target_country=request.get("country", "US"),
                client_knowledge_base=request.get("client_knowledge_base"),
                content_instructions=kw_data.get("instructions") or request.get("content_instructions"),
            )
            
            result = await generate_blog_endpoint(blog_request, engine)
            results.append({
                "keyword": kw_data["keyword"],
                "success": True,
                "title": result.title,
                "content": result.content,
                "word_count": result.word_count,
                "aeo_score": result.aeo_score,
            })
        except Exception as e:
            results.append({
                "keyword": kw_data["keyword"],
                "success": False,
                "error": str(e)
            })
    
    return {
        "batch_id": f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "total": len(keywords),
        "successful": sum(1 for r in results if r.get("success")),
        "failed": sum(1 for r in results if not r.get("success")),
        "results": results
    }

if __name__ == "__main__":
    print("🚀 Starting Blog Writer Local Server on http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")

