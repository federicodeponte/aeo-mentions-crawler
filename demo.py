#!/usr/bin/env python3
"""
Demo script for PEEC AI Backend
Shows the core functionality without requiring the full API server
"""

import asyncio
import os
from dotenv import load_dotenv
from services.llm_service import LLMService
from services.supabase_service import SupabaseService

# Load environment variables
load_dotenv()

async def demo_llm_processing():
    """Demo LLM processing with a sample prompt"""
    print("=== LLM Processing Demo ===\n")
    
    # Initialize LLM service
    llm_service = LLMService()
    
    # Sample prompt and company
    prompt = "What are the latest developments in sustainable building materials?"
    company_name = "Planeco Building"
    
    print(f"Prompt: {prompt}")
    print(f"Company: {company_name}")
    print("\nProcessing with multiple LLM models...\n")
    
    try:
        # Process with all models
        results = await llm_service.process_prompt_test(
            prompt, 
            company_name, 
            ["chatgpt", "gemini", "perplexity"]
        )
        
        # Display results
        for model, result in results.items():
            print(f"--- {model.upper()} ---")
            
            if "error" in result:
                print(f"Error: {result['error']}")
            else:
                print(f"AI Mentions: {result['ai_mentions']}")
                print(f"Source Mentions: {result['source_mentions']}")
                print(f"Links Found: {len(result['links'])}")
                
                if result['links']:
                    print("Link Categories:")
                    categories = {}
                    for link in result['links']:
                        cat = link['type']
                        categories[cat] = categories.get(cat, 0) + 1
                    
                    for cat, count in categories.items():
                        print(f"  - {cat}: {count}")
                
                print(f"Response Length: {len(result['response'])} characters")
                print(f"Response Preview: {result['response'][:200]}...")
            
            print()
        
        return results
        
    except Exception as e:
        print(f"Error in LLM processing: {e}")
        return None

async def demo_supabase_operations():
    """Demo Supabase database operations"""
    print("=== Supabase Operations Demo ===\n")
    
    try:
        # Initialize Supabase service
        supabase_service = SupabaseService()
        
        # Get existing companies
        companies = supabase_service.get_companies()
        print(f"Found {len(companies)} companies in database:")
        
        for company in companies:
            print(f"  - {company['name']} (ID: {company['id']})")
        
        print()
        
        # Get prompts for first company
        if companies:
            company_id = companies[0]['id']
            prompts = supabase_service.get_prompts(company_id)
            print(f"Found {len(prompts)} prompts for company {companies[0]['name']}:")
            
            for prompt in prompts:
                print(f"  - {prompt['text'][:100]}...")
        
        print()
        
        # Get recent monitoring runs
        runs = supabase_service.get_monitoring_runs()
        print(f"Found {len(runs)} monitoring runs:")
        
        for run in runs[:5]:  # Show first 5
            print(f"  - Company {run['company_id']} on {run['date']} - {run['status']}")
        
        return companies
        
    except Exception as e:
        print(f"Error in Supabase operations: {e}")
        return None

async def demo_full_workflow():
    """Demo the full workflow from prompt to stored results"""
    print("=== Full Workflow Demo ===\n")
    
    try:
        # Initialize services
        supabase_service = SupabaseService()
        llm_service = LLMService()
        
        # Get first company and prompt
        companies = supabase_service.get_companies()
        if not companies:
            print("No companies found in database")
            return
        
        company = companies[0]
        prompts = supabase_service.get_prompts(company['id'])
        
        if not prompts:
            print("No prompts found for company")
            return
        
        prompt = prompts[0]
        
        print(f"Processing workflow for:")
        print(f"Company: {company['name']}")
        print(f"Prompt: {prompt['text']}")
        print()
        
        # Create monitoring run
        from datetime import date
        today = date.today().isoformat()
        
        monitoring_run = supabase_service.create_monitoring_run(company['id'], today)
        print(f"Created monitoring run: {monitoring_run['id']}")
        
        # Process with one model (ChatGPT for demo)
        print("Processing with ChatGPT...")
        result = await llm_service.process_prompt_for_monitoring(
            prompt['text'], 
            company['name'], 
            'chatgpt'
        )
        
        # Store result
        stored_result = supabase_service.store_llm_result(
            run_id=monitoring_run['id'],
            model='chatgpt',
            prompt_id=prompt['id'],
            response=result['response'],
            links=result['links'],
            ai_mentions=result['ai_mentions'],
            source_mentions=result['source_mentions']
        )
        
        print(f"Stored result: {stored_result['id']}")
        print(f"AI Mentions: {result['ai_mentions']}")
        print(f"Source Mentions: {result['source_mentions']}")
        print(f"Links Found: {len(result['links'])}")
        
        # Update run status
        supabase_service.update_monitoring_run(monitoring_run['id'], 'completed')
        print("Updated run status to completed")
        
        return stored_result
        
    except Exception as e:
        print(f"Error in full workflow: {e}")
        return None

async def main():
    """Run all demos"""
    print("🚀 PEEC AI Backend Demo\n")
    
    # Check if environment is configured
    required_vars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "PERPLEXITY_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease configure your .env file and run again")
        return
    
    print("✅ Environment configured\n")
    
    # Run demos
    demos = [
        ("LLM Processing", demo_llm_processing),
        ("Supabase Operations", demo_supabase_operations),
        ("Full Workflow", demo_full_workflow),
    ]
    
    for demo_name, demo_func in demos:
        print(f"\n{'='*50}")
        print(f"Running {demo_name} Demo")
        print(f"{'='*50}")
        
        try:
            await demo_func()
        except Exception as e:
            print(f"❌ Demo failed: {e}")
        
        print("\n" + "="*50)
    
    print("\n🎉 Demo completed!")
    print("\nNext steps:")
    print("1. Run organic monitoring: python run_monitor.py")
    print("2. Interactive testing: python simple_monitor.py")
    print("3. Batch processing: python batch_monitor.py")

if __name__ == "__main__":
    asyncio.run(main()) 