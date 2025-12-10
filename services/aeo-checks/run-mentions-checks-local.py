#!/usr/bin/env python3
"""
AEO Mentions Check Pipeline - LOCAL EXECUTION
Runs mentions checks locally by importing the service code directly.
No HTTP calls to Modal - runs the logic in-process.
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

# Add services directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "services" / "aeo-checks"))

# Import mentions service components directly
from mentions_service import (
    generate_queries,
    query_platform,
    count_mentions,  # ADD THIS
    MentionsCheckRequest,
    CompanyAnalysis,
    AI_PLATFORMS
)

# Setup logging
# Setup logging - use temp directory in Modal, local directory otherwise
log_dir = Path("/tmp") if Path("/tmp").exists() else Path(__file__).parent
log_file = log_dir / 'mentions-check.log'
try:
    handlers = [
        logging.FileHandler(str(log_file)),
        logging.StreamHandler()
    ]
except Exception:
    # If file logging fails, just use console
    handlers = [logging.StreamHandler()]

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=handlers
)
logger = logging.getLogger(__name__)

# Load environment
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)


async def get_companies_needing_mentions_check(limit=None, offset=None):
    """Fetch companies that have company_info but no mentions data."""
    import httpx
    
    url = f"{SUPABASE_URL}/rest/v1/leaderboard_startups"
    params = {
        "select": "id,name,company_info,competitors",
        "company_info": "not.is.null",  # Has company analysis
        "mentions_visibility": "is.null",  # No mentions check
        "order": "name.asc"
    }
    if limit:
        params["limit"] = limit
    if offset:
        params["offset"] = offset
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params, headers=headers)
        response.raise_for_status()
        companies = response.json()
        logger.info(f"✅ Found {len(companies)} companies needing mentions check")
        return companies


async def run_mentions_check_local(company_name: str, company_info: dict, competitors: list):
    """Run mentions check locally by calling service functions directly."""
    try:
        logger.info(f"🔍 {company_name}: Running LOCAL mentions check (fast mode)...")
        
        # Create company analysis object
        company_analysis = CompanyAnalysis(
            companyInfo=company_info,
            competitors=competitors or []
        )
        
        # Fast mode: only Gemini
        platforms = ["gemini"]
        mode = "fast"
        num_queries = 10
        
        # Generate queries locally
        queries = generate_queries(
            company_name,
            company_analysis,
            num_queries,
            mode
        )
        logger.info(f"📊 {company_name}: Generated {len(queries)} queries")
        
        # Query ALL queries × ALL platforms in parallel (much faster!)
        all_results = []
        platform_stats = {p: {"mentions": 0, "quality_score": 0, "responses": 0, "errors": 0} for p in platforms}
        dimension_stats = {}
        
        # Build all tasks: (query, platform) pairs
        all_tasks = []
        task_metadata = []  # Track (query, dimension, platform) for each task
        
        for query_obj in queries:
            query = query_obj["query"]
            dimension = query_obj["dimension"]
            
            for platform in platforms:
                platform_config = AI_PLATFORMS[platform]
                # Note: query_platform signature is (platform, query, model_config)
                all_tasks.append(query_platform(platform, query, platform_config))
                task_metadata.append((query, dimension, platform))
        
        # Execute ALL queries × platforms in parallel
        logger.info(f"🚀 {company_name}: Executing {len(all_tasks)} API calls in parallel ({len(queries)} queries × {len(platforms)} platforms)")
        results = await asyncio.gather(*all_tasks, return_exceptions=True)
        
        # Process results
        for (query, dimension, platform), result in zip(task_metadata, results):
            if isinstance(result, Exception):
                logger.warning(f"⚠️  {company_name}: {platform} error for query '{query[:50]}...': {result}")
                platform_stats[platform]["errors"] += 1
                continue
            
            platform_stats[platform]["responses"] += 1
            
            # IMPORTANT: Count mentions in the response
            response_text = result.get("response", "")
            mention_data = count_mentions(response_text, company_name)
            
            if mention_data["capped_mentions"] > 0:
                platform_stats[platform]["mentions"] += mention_data["capped_mentions"]
                
                # Track dimension stats
                if dimension not in dimension_stats:
                    dimension_stats[dimension] = {"mentions": 0, "queries": 0}
                dimension_stats[dimension]["mentions"] += mention_data["capped_mentions"]
            
            # Track quality
            quality = mention_data["quality_score"]
            platform_stats[platform]["quality_score"] += quality
            
            # Save result (don't truncate - we need full response for mention detection)
            all_results.append({
                "query": query,
                "dimension": dimension,
                "platform": platform,
                "mentioned": mention_data["capped_mentions"] > 0,
                "response": response_text,  # Full response needed
                "quality": quality
            })
        
        # Track dimension query count
        for query_obj in queries:
            dimension = query_obj["dimension"]
            if dimension not in dimension_stats:
                dimension_stats[dimension] = {"mentions": 0, "queries": 0}
            dimension_stats[dimension]["queries"] += 1
        
        # Calculate scores (simple scoring logic)
        total_mentions = sum(p["mentions"] for p in platform_stats.values())
        total_responses = sum(p["responses"] for p in platform_stats.values())
        total_queries_sent = len(queries) * len(platforms)
        
        # Visibility score: percentage of queries with mentions (capped at 100)
        visibility_score = min(100.0, (total_mentions / total_queries_sent * 100) if total_queries_sent > 0 else 0)
        
        # Quality score: average quality across all results
        quality_results = [r for r in all_results if r.get("mentioned")]
        quality_score = (sum(r.get("quality", 0) for r in quality_results) / len(quality_results)) if quality_results else 0
        
        # Determine band
        if visibility_score >= 80:
            band = "Excellent"
        elif visibility_score >= 60:
            band = "Good"
        elif visibility_score >= 40:
            band = "Fair"
        elif visibility_score >= 20:
            band = "Limited"
        else:
            band = "Poor"
        
        logger.info(f"✅ {company_name}: Visibility {visibility_score:.1f}/100 (Band: {band}, Mentions: {total_mentions})")
        
        return {
            "success": True,
            "visibility_score": visibility_score,
            "visibility_band": band,
            "total_mentions": total_mentions,
            "quality_score": quality_score,
            "platform_stats": platform_stats,
            "dimension_stats": dimension_stats,
            "query_results": all_results[:50]  # Limit stored results
        }
        
    except Exception as e:
        logger.error(f"❌ {company_name}: Error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e)}


async def process_company_mentions(company: dict):
    """Process a single company's mentions check and save to database."""
    company_name = company["name"]
    company_id = company["id"]
    
    logger.info(f"🔍 [{company_name}] Starting mentions check...")
    
    # Run mentions check locally
    result = await run_mentions_check_local(
        company_name,
        company["company_info"],
        company.get("competitors", [])
    )
    
    if result.get("success"):
        # Save to database
        if await save_mentions_result(company_id, company_name, result):
            logger.info(f"✅ [{company_name}] Completed successfully")
            return True
        else:
            logger.error(f"❌ [{company_name}] Failed to save")
            return False
    else:
        logger.error(f"❌ [{company_name}] Mentions check failed: {result.get('error', 'Unknown error')}")
        return False


async def save_mentions_result(company_id: str, company_name: str, result: dict):
    """Save mentions check result to database."""
    import httpx
    
    if not result.get("success"):
        return False
    
    try:
        update_url = f"{SUPABASE_URL}/rest/v1/leaderboard_startups"
        params = {"id": f"eq.{company_id}"}
        payload = {
            "mentions_visibility": result["visibility_score"],
            "mentions_band": result["visibility_band"],
            "total_mentions": result["total_mentions"],
            "quality_score": result["quality_score"],
            "platform_stats": result["platform_stats"],
            "dimension_stats": result["dimension_stats"],
            "query_results": result["query_results"],
            "last_mentions_check": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.patch(
                update_url,
                params=params,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
        
        logger.info(f"💾 {company_name}: Mentions check saved")
        return True
        
    except Exception as e:
        logger.error(f"❌ {company_name}: Save error: {e}")
        return False


async def main():
    """Main execution."""
    limit = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else None
    offset = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else None
    
    logger.info("=" * 80)
    logger.info("🔍 AEO MENTIONS CHECK PIPELINE (LOCAL)")
    logger.info(f"   Limit: {limit or 'ALL'}")
    logger.info(f"   Offset: {offset or 0}")
    logger.info(f"   Mode: FAST (10 queries, Gemini + ChatGPT only)")
    logger.info(f"   Execution: LOCAL (no HTTP calls to Modal)")
    logger.info("=" * 80)
    
    start_time = datetime.now()
    
    # Get companies
    companies = await get_companies_needing_mentions_check(limit, offset)
    
    if not companies:
        logger.info("✅ No companies need mentions checks!")
        return
    
    logger.info(f"\n📊 Processing {len(companies)} companies...")
    
    # Process in parallel batches (increased for better throughput)
    BATCH_SIZE = 10  # Process 10 companies in parallel (optimized for speed)
    batches = [
        companies[i:i + BATCH_SIZE]
        for i in range(0, len(companies), BATCH_SIZE)
    ]
    
    logger.info(f"   Batch size: {BATCH_SIZE} companies in parallel")
    logger.info(f"   Total batches: {len(batches)}")
    logger.info(f"⏱️  Estimated: ~30-60 seconds per company (with {BATCH_SIZE}x parallelization + parallel queries)")
    
    successful = 0
    failed = 0
    
    for batch_num, batch in enumerate(batches, 1):
        logger.info(f"\n{'='*80}")
        logger.info(f"📦 BATCH {batch_num}/{len(batches)} - Processing {len(batch)} companies in parallel")
        logger.info(f"{'='*80}")
        
        # Process all companies in batch in parallel
        tasks = []
        for company in batch:
            task = process_company_mentions(company)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successes and failures
        for result in results:
            if isinstance(result, Exception):
                failed += 1
                logger.error(f"❌ Batch error: {result}")
            elif result:
                successful += 1
            else:
                failed += 1
        
        logger.info(f"✅ Batch {batch_num} complete: {successful} successful, {failed} failed total")
    
    # Summary
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info("\n" + "=" * 80)
    logger.info("🎉 MENTIONS CHECK COMPLETE")
    logger.info("=" * 80)
    logger.info(f"   Total: {len(companies)}")
    logger.info(f"   ✅ Successful: {successful}")
    logger.info(f"   ❌ Failed: {failed}")
    logger.info(f"   ⏱️  Time: {elapsed/60:.1f} minutes ({elapsed/len(companies):.1f}s per company)")
    logger.info("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())

