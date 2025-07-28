#!/usr/bin/env python3
"""
PEEC AI Batch Monitor - No Server Required
Run monitoring for multiple companies in batch mode
"""

import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services
from services.llm_service import LLMService

class BatchMonitor:
    def __init__(self):
        self.llm_service = LLMService()
        
    async def monitor_company(self, company_name: str, prompts: list):
        """Monitor a company with specific prompts"""
        print(f"\n🔍 Monitoring {company_name}")
        print("=" * 50)
        
        results = {}
        models = ["perplexity", "gemini"]  # Working models
        
        for i, prompt in enumerate(prompts, 1):
            print(f"\n📋 Prompt {i}/{len(prompts)}: {prompt[:60]}...")
            
            prompt_results = {}
            
            for model in models:
                try:
                    print(f"   🤖 Testing {model.upper()}...")
                    
                    result = await self.llm_service.process_prompt_for_monitoring(
                        prompt, company_name, model
                    )
                    
                    prompt_results[model] = {
                        'ai_mentions': result.get('ai_mentions', 0),
                        'links_count': len(result.get('links', [])),
                        'links': result.get('links', []),
                        'response_preview': result['response'][:200] + "..."
                    }
                    
                    print(f"      ✅ {result.get('ai_mentions', 0)} mentions, {len(result.get('links', []))} links")
                    
                except Exception as e:
                    print(f"      ❌ Error: {e}")
                    prompt_results[model] = {'error': str(e)}
            
            results[f"prompt_{i}"] = {
                'prompt': prompt,
                'results': prompt_results
            }
        
        return results
    
    async def run_batch_monitoring(self):
        """Run monitoring for predefined companies"""
        print("🚀 PEEC AI Batch Monitoring")
        print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        
        # Define your companies and prompts here
        companies = {
            "Scaile": [
                "How does Scaile appear in AI search results compared to their main competitors?",
                "What are the latest mentions of Scaile in digital marketing discussions?",
                "How is Scaile positioned in AI-powered marketing tool comparisons?"
            ],
            "Valoon": [
                "What are the competitors of Valoon in construction communication?",
                "How does Valoon compare to other construction project management tools?",
                "What are the latest developments in construction communication platforms?"
            ]
        }
        
        all_results = {}
        
        for company_name, prompts in companies.items():
            try:
                results = await self.monitor_company(company_name, prompts)
                all_results[company_name] = results
                
                # Save individual company results
                filename = f"batch_{company_name}_{datetime.now().strftime('%Y%m%d')}.json"
                with open(filename, 'w') as f:
                    json.dump({
                        'company': company_name,
                        'date': datetime.now().isoformat(),
                        'results': results
                    }, f, indent=2)
                
                print(f"   💾 Saved {company_name} results to {filename}")
                
            except Exception as e:
                print(f"❌ Error monitoring {company_name}: {e}")
                all_results[company_name] = {'error': str(e)}
        
        # Save combined results
        combined_filename = f"batch_all_companies_{datetime.now().strftime('%Y%m%d')}.json"
        with open(combined_filename, 'w') as f:
            json.dump({
                'batch_date': datetime.now().isoformat(),
                'companies': all_results
            }, f, indent=2)
        
        print(f"\n✅ Batch monitoring complete!")
        print(f"📊 Monitored {len(companies)} companies")
        print(f"💾 Combined results saved to: {combined_filename}")
        
        return all_results
    
    def generate_summary_report(self, results_file: str):
        """Generate a simple text summary from JSON results"""
        try:
            with open(results_file, 'r') as f:
                data = json.load(f)
            
            report_lines = []
            report_lines.append("PEEC AI Monitoring Summary Report")
            report_lines.append("=" * 40)
            report_lines.append(f"Date: {data.get('batch_date', 'Unknown')}")
            report_lines.append("")
            
            total_mentions = 0
            
            for company, company_data in data.get('companies', {}).items():
                if 'error' in company_data:
                    report_lines.append(f"❌ {company}: Error - {company_data['error']}")
                    continue
                
                report_lines.append(f"🏢 {company}")
                report_lines.append("-" * 20)
                
                company_mentions = 0
                
                for prompt_key, prompt_data in company_data.items():
                    prompt = prompt_data['prompt'][:60] + "..."
                    report_lines.append(f"  📋 {prompt}")
                    
                    for model, result in prompt_data.get('results', {}).items():
                        if 'error' not in result:
                            mentions = result.get('ai_mentions', 0)
                            links = result.get('links_count', 0)
                            company_mentions += mentions
                            report_lines.append(f"    {model.upper()}: {mentions} mentions, {links} links")
                        else:
                            report_lines.append(f"    {model.upper()}: Error")
                
                total_mentions += company_mentions
                report_lines.append(f"  Total mentions for {company}: {company_mentions}")
                report_lines.append("")
            
            report_lines.append(f"🎯 TOTAL MENTIONS ACROSS ALL COMPANIES: {total_mentions}")
            
            # Save report
            report_filename = results_file.replace('.json', '_summary.txt')
            with open(report_filename, 'w') as f:
                f.write('\n'.join(report_lines))
            
            print(f"📄 Summary report saved to: {report_filename}")
            
            # Print summary to console
            for line in report_lines[-10:]:  # Show last 10 lines
                print(line)
                
        except Exception as e:
            print(f"❌ Error generating summary: {e}")

async def main():
    """Main execution function"""
    monitor = BatchMonitor()
    
    print("Choose option:")
    print("1. Run batch monitoring for all companies")
    print("2. Generate summary from existing results")
    
    choice = input("Enter choice (1-2): ").strip()
    
    if choice == "1":
        results = await monitor.run_batch_monitoring()
        
        # Ask if user wants summary
        if input("\nGenerate summary report? (y/n): ").lower() == 'y':
            latest_file = f"batch_all_companies_{datetime.now().strftime('%Y%m%d')}.json"
            monitor.generate_summary_report(latest_file)
    
    elif choice == "2":
        filename = input("Enter JSON results filename: ").strip()
        if os.path.exists(filename):
            monitor.generate_summary_report(filename)
        else:
            print(f"❌ File not found: {filename}")

if __name__ == "__main__":
    asyncio.run(main()) 