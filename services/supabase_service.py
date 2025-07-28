import os
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
        
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
        
    def create_company(self, name: str, search_terms: List[str]) -> Dict[str, Any]:
        """Create a new company"""
        try:
            data = {
                "name": name,
                "search_terms": search_terms,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.client.table("companies").insert(data).execute()
            
            if result.data:
                logger.info(f"Created company: {name}")
                return result.data[0]
            else:
                raise Exception("Failed to create company")
                
        except Exception as e:
            logger.error(f"Error creating company: {e}")
            raise
    
    def get_companies(self) -> List[Dict[str, Any]]:
        """Get all companies"""
        try:
            result = self.client.table("companies").select("*").order("created_at", desc=True).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching companies: {e}")
            raise
    
    def get_company(self, company_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific company by ID"""
        try:
            result = self.client.table("companies").select("*").eq("id", company_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error fetching company {company_id}: {e}")
            raise
    
    def create_prompt(self, company_id: int, text: str, category: str = "general") -> Dict[str, Any]:
        """Create a new prompt"""
        try:
            data = {
                "company_id": company_id,
                "text": text,
                "category": category,
                "active": True,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.client.table("prompts").insert(data).execute()
            
            if result.data:
                logger.info(f"Created prompt for company {company_id}")
                return result.data[0]
            else:
                raise Exception("Failed to create prompt")
                
        except Exception as e:
            logger.error(f"Error creating prompt: {e}")
            raise
    
    def get_prompts(self, company_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get prompts, optionally filtered by company"""
        try:
            query = self.client.table("prompts").select("*")
            
            if company_id:
                query = query.eq("company_id", company_id)
            
            result = query.eq("active", True).order("created_at", desc=True).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching prompts: {e}")
            raise
    
    def create_monitoring_run(self, company_id: int, run_date: str) -> Dict[str, Any]:
        """Create a new monitoring run"""
        try:
            data = {
                "company_id": company_id,
                "date": run_date,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.client.table("monitoring_runs").insert(data).execute()
            
            if result.data:
                logger.info(f"Created monitoring run for company {company_id} on {run_date}")
                return result.data[0]
            else:
                raise Exception("Failed to create monitoring run")
                
        except Exception as e:
            logger.error(f"Error creating monitoring run: {e}")
            raise
    
    def update_monitoring_run(self, run_id: int, status: str) -> Dict[str, Any]:
        """Update monitoring run status"""
        try:
            data = {
                "status": status,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            result = self.client.table("monitoring_runs").update(data).eq("id", run_id).execute()
            
            if result.data:
                logger.info(f"Updated monitoring run {run_id} to status: {status}")
                return result.data[0]
            else:
                raise Exception("Failed to update monitoring run")
                
        except Exception as e:
            logger.error(f"Error updating monitoring run: {e}")
            raise
    
    def store_llm_result(self, run_id: int, model: str, prompt_id: int, 
                        response: str, links: List[Dict[str, Any]], 
                        ai_mentions: int, source_mentions: int) -> Dict[str, Any]:
        """Store LLM processing result"""
        try:
            data = {
                "run_id": run_id,
                "model": model,
                "prompt_id": prompt_id,
                "response": response,
                "links": links,
                "ai_mentions": ai_mentions,
                "source_mentions": source_mentions,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.client.table("llm_results").insert(data).execute()
            
            if result.data:
                logger.info(f"Stored LLM result for run {run_id}, model {model}")
                return result.data[0]
            else:
                raise Exception("Failed to store LLM result")
                
        except Exception as e:
            logger.error(f"Error storing LLM result: {e}")
            raise
    
    def get_company_results(self, company_id: int, date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get results for a company, optionally filtered by date"""
        try:
            # Build the query to join tables
            query = """
                SELECT 
                    lr.*,
                    p.text as prompt_text,
                    c.name as company_name,
                    mr.date as run_date
                FROM llm_results lr
                JOIN prompts p ON lr.prompt_id = p.id
                JOIN monitoring_runs mr ON lr.run_id = mr.id
                JOIN companies c ON mr.company_id = c.id
                WHERE c.id = ?
            """
            
            params = [company_id]
            
            if date:
                query += " AND mr.date = ?"
                params.append(date)
            
            query += " ORDER BY lr.created_at DESC"
            
            # Execute raw query
            result = self.client.rpc("execute_sql", {
                "query": query,
                "params": params
            }).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error fetching company results: {e}")
            # Fallback to simpler query if RPC fails
            try:
                # Get monitoring runs for the company
                runs_result = self.client.table("monitoring_runs").select("id").eq("company_id", company_id)
                if date:
                    runs_result = runs_result.eq("date", date)
                runs_result = runs_result.execute()
                
                if not runs_result.data:
                    return []
                
                run_ids = [run["id"] for run in runs_result.data]
                
                # Get results for these runs
                results = []
                for run_id in run_ids:
                    result = self.client.table("llm_results").select("*").eq("run_id", run_id).execute()
                    results.extend(result.data)
                
                return results
                
            except Exception as fallback_error:
                logger.error(f"Fallback query also failed: {fallback_error}")
                raise
    
    def get_monitoring_runs(self, company_id: Optional[int] = None, 
                           status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get monitoring runs with optional filters"""
        try:
            query = self.client.table("monitoring_runs").select("*")
            
            if company_id:
                query = query.eq("company_id", company_id)
            
            if status:
                query = query.eq("status", status)
            
            result = query.order("created_at", desc=True).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching monitoring runs: {e}")
            raise 