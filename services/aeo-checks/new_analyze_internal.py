"""
Single-Phase Company Analysis with Parallel Execution

This is the refactored _analyze_internal function that replaces the old 2-phase approach.
"""

async def _analyze_internal(request: CompanyAnalysisRequest, domain: str):
    """
    Single-phase company analysis with parallel execution.
    
    Architecture:
    - Main: Gemini 3 Pro (company + competitors + pain points + ALL in one call)
    - Parallel: Logo detection, brand assets, tech stack
    
    All run simultaneously using asyncio.gather()
    """
    
    logger.info(f"🚀 Starting single-phase parallel analysis for {request.company_name}")
    
    # Import Gemini client
    from gemini_client import get_gemini_client
    
    # Create all parallel tasks
    tasks = []
    
    # Task 1: Main Gemini 3 Pro analysis 
    # - Uses google_search + url_context natively
    # - Returns: company_info, competitors, insights, legal_info, pain_points, etc.
    gemini_client = get_gemini_client()
    tasks.append(gemini_client.analyze_company(
        website_url=request.website_url,
        company_name=request.company_name,
        schema=COMPANY_ANALYSIS_SCHEMA
    ))
    
    # Task 2: Brand assets extraction (colors, fonts from CSS)
    tasks.append(extract_brand_assets_async(request.website_url, domain))
    
    # Task 3: Logo detection (GPT-4o-mini vision)
    if request.extract_logo:
        tasks.append(fetch_logo_async(request.website_url))
    else:
        tasks.append(asyncio.create_task(asyncio.sleep(0)))  # Placeholder
    
    # Task 4: Technology detection (Playwright)
    tasks.append(detect_website_technology_async(request.website_url))
    
    # Execute all 4 tasks in parallel
    logger.info("⚡ Executing 4 parallel tasks: Gemini, brand assets, logo, tech stack")
    
    try:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        gemini_result, brand_result, logo_result, tech_result = results
        
        # ===== Process Gemini Result (Main) =====
        if isinstance(gemini_result, Exception):
            logger.error(f"❌ Gemini analysis failed: {gemini_result}")
            raise RuntimeError(f"Main analysis failed: {gemini_result}")
        
        company_info = gemini_result.get("company_info", {})
        legal_info = gemini_result.get("legal_info", {})
        competitors = gemini_result.get("competitors", [])
        insights = gemini_result.get("insights", [])
        brand_voice = gemini_result.get("brand_voice")
        tone = gemini_result.get("tone")
        
        logger.info(f"✅ Gemini analysis complete: {len(competitors)} competitors, {len(insights)} insights")
        
        # ===== Process Brand Assets =====
        brand_assets = BrandAssets()
        if isinstance(brand_result, Exception):
            logger.warning(f"⚠️  Brand assets extraction failed: {brand_result}")
        else:
            brand_assets = brand_result
            logger.info(f"✅ Brand: {len(brand_assets.colors)} colors, {len(brand_assets.fonts)} fonts")
        
        # ===== Process Logo =====
        if request.extract_logo:
            if isinstance(logo_result, Exception):
                logger.warning(f"⚠️  Logo detection failed: {logo_result}")
            elif logo_result:
                brand_assets.logo = logo_result
                logger.info(f"✅ Logo: {logo_result.url} (confidence: {logo_result.confidence:.2f})")
            else:
                logger.info("ℹ️  No logo detected")
        
        # ===== Process Tech Stack =====
        website_tech = None
        if isinstance(tech_result, Exception):
            logger.warning(f"⚠️  Technology detection failed: {tech_result}")
        else:
            website_tech = tech_result
            if website_tech:
                logger.info(f"✅ Tech: CMS={website_tech.cms}, Frameworks={website_tech.frameworks}")
            else:
                logger.info("ℹ️  No technology detected")
        
        logger.info(f"🎉 Single-phase analysis complete for {request.company_name}")
        
        # ===== Build Final Result =====
        result = CompanyAnalysisResponse(
            company_info=company_info,
            competitors=competitors,
            insights=insights,
            legal_info=legal_info,
            brand_voice=brand_voice,
            tone=tone,
            brand_assets=brand_assets,
            website_tech=website_tech
        )
        
        # ===== Save to Supabase (if requested) =====
        if request.client_id and request.supabase_url and request.supabase_key:
            logger.info(f"💾 Saving results to Supabase for client {request.client_id}")
            saved = await save_to_supabase(
                request.supabase_url,
                request.supabase_key,
                request.client_id,
                result,
            )
            if not saved:
                logger.error(f"❌ Failed to save to Supabase for client {request.client_id}")

            # Trigger mentions check if requested (only after successful save)
            if saved and request.trigger_mentions_check and request.mentions_check_params:
                logger.info(f"🔔 Triggering mentions check for {request.company_name}")
                await trigger_mentions_check(
                    request.supabase_url,
                    request.supabase_key,
                    request.company_name,
                    request.client_id,
                    request.mentions_check_params,
                )
        
        # Return as dict for JSON serialization
        return result.model_dump()
        
    except Exception as e:
        logger.error(f"❌ Single-phase parallel execution failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise

