import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from services.supabase_service import SupabaseService
from services.llm_service import LLMService

logger = logging.getLogger(__name__)

class MonitoringService:
    def __init__(self, supabase_service: SupabaseService, llm_service: LLMService):
        self.supabase_service = supabase_service
        self.llm_service = llm_service
        self.is_running = False
        self.current_status = "idle"
        self.last_run = None
        self.error_count = 0
        
    async def execute_daily_monitoring(self):
        """Execute daily monitoring for all companies"""
        if self.is_running:
            logger.warning("Daily monitoring is already running")
            return
        
        self.is_running = True
        self.current_status = "running"
        self.error_count = 0
        
        try:
            logger.info("Starting daily monitoring execution")
            
            # Get all companies
            companies = self.supabase_service.get_companies()
            if not companies:
                logger.info("No companies found for monitoring")
                return
            
            today = date.today().isoformat()
            
            for company in companies:
                try:
                    await self._process_company(company, today)
                except Exception as e:
                    logger.error(f"Error processing company {company['name']}: {e}")
                    self.error_count += 1
                    continue
            
            self.current_status = "completed"
            self.last_run = datetime.utcnow().isoformat()
            logger.info(f"Daily monitoring completed. Processed {len(companies)} companies")
            
        except Exception as e:
            logger.error(f"Error in daily monitoring: {e}")
            self.current_status = "error"
            self.error_count += 1
        finally:
            self.is_running = False
    
    async def _process_company(self, company: Dict[str, Any], run_date: str):
        """Process a single company's prompts"""
        company_id = company["id"]
        company_name = company["name"]
        
        logger.info(f"Processing company: {company_name}")
        
        # Create monitoring run
        monitoring_run = self.supabase_service.create_monitoring_run(company_id, run_date)
        run_id = monitoring_run["id"]
        
        try:
            # Get prompts for this company
            prompts = self.supabase_service.get_prompts(company_id)
            if not prompts:
                logger.info(f"No prompts found for company {company_name}")
                return
            
            # Process each prompt with all models
            for prompt in prompts:
                await self._process_prompt(prompt, company_name, run_id)
            
            # Update run status to completed
            self.supabase_service.update_monitoring_run(run_id, "completed")
            logger.info(f"Completed monitoring run for company {company_name}")
            
        except Exception as e:
            logger.error(f"Error processing company {company_name}: {e}")
            self.supabase_service.update_monitoring_run(run_id, "error")
            raise
    
    async def _process_prompt(self, prompt: Dict[str, Any], company_name: str, run_id: int):
        """Process a single prompt with all LLM models"""
        prompt_id = prompt["id"]
        prompt_text = prompt["text"]
        
        logger.info(f"Processing prompt {prompt_id} for company {company_name}")
        
        # Process with each model
        models = ["chatgpt", "gemini", "perplexity"]
        
        for model in models:
            try:
                # Process with specific model
                result = await self.llm_service.process_prompt_for_monitoring(
                    prompt_text, company_name, model
                )
                
                # Store result
                self.supabase_service.store_llm_result(
                    run_id=run_id,
                    model=model,
                    prompt_id=prompt_id,
                    response=result["response"],
                    links=result["links"],
                    ai_mentions=result["ai_mentions"],
                    source_mentions=result["source_mentions"]
                )
                
                logger.info(f"Stored result for prompt {prompt_id} with {model}")
                
            except Exception as e:
                logger.error(f"Error processing prompt {prompt_id} with {model}: {e}")
                # Continue with other models even if one fails
                continue
    
    def get_status(self) -> Dict[str, Any]:
        """Get current monitoring status"""
        return {
            "is_running": self.is_running,
            "status": self.current_status,
            "last_run": self.last_run,
            "error_count": self.error_count
        }
    
    async def execute_single_company(self, company_id: int) -> Dict[str, Any]:
        """Execute monitoring for a single company"""
        try:
            company = self.supabase_service.get_company(company_id)
            if not company:
                raise ValueError(f"Company {company_id} not found")
            
            today = date.today().isoformat()
            await self._process_company(company, today)
            
            return {
                "success": True,
                "company_name": company["name"],
                "date": today
            }
            
        except Exception as e:
            logger.error(f"Error executing single company monitoring: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def execute_single_prompt(self, prompt_id: int, company_id: int, 
                                  models: List[str] = None) -> Dict[str, Any]:
        """Execute monitoring for a single prompt"""
        try:
            if models is None:
                models = ["chatgpt", "gemini", "perplexity"]
            
            company = self.supabase_service.get_company(company_id)
            if not company:
                raise ValueError(f"Company {company_id} not found")
            
            prompts = self.supabase_service.get_prompts(company_id)
            target_prompt = None
            
            for prompt in prompts:
                if prompt["id"] == prompt_id:
                    target_prompt = prompt
                    break
            
            if not target_prompt:
                raise ValueError(f"Prompt {prompt_id} not found for company {company_id}")
            
            today = date.today().isoformat()
            
            # Create monitoring run
            monitoring_run = self.supabase_service.create_monitoring_run(company_id, today)
            run_id = monitoring_run["id"]
            
            results = {}
            
            for model in models:
                try:
                    result = await self.llm_service.process_prompt_for_monitoring(
                        target_prompt["text"], company["name"], model
                    )
                    
                    # Store result
                    stored_result = self.supabase_service.store_llm_result(
                        run_id=run_id,
                        model=model,
                        prompt_id=prompt_id,
                        response=result["response"],
                        links=result["links"],
                        ai_mentions=result["ai_mentions"],
                        source_mentions=result["source_mentions"]
                    )
                    
                    results[model] = stored_result
                    
                except Exception as e:
                    logger.error(f"Error processing prompt {prompt_id} with {model}: {e}")
                    results[model] = {"error": str(e)}
            
            # Update run status
            self.supabase_service.update_monitoring_run(run_id, "completed")
            
            return {
                "success": True,
                "run_id": run_id,
                "company_name": company["name"],
                "prompt_text": target_prompt["text"],
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Error executing single prompt monitoring: {e}")
            return {
                "success": False,
                "error": str(e)
            } 