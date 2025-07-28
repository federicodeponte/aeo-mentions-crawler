#!/usr/bin/env python3
"""
PEEC AI Daily Cron Job - No Server Required
Add this to your crontab to run daily monitoring automatically

Usage:
1. Make executable: chmod +x daily_cron.py
2. Add to crontab: 0 9 * * * /path/to/daily_cron.py
"""

import os
import sys
import asyncio
import logging
from datetime import datetime
from pathlib import Path

# Add current directory to Python path
sys.path.append(str(Path(__file__).parent))

from standalone_monitor import StandaloneMonitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'peec_monitoring_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

async def main():
    """Run daily monitoring and save results"""
    try:
        logger.info("🚀 Starting PEEC AI Daily Monitoring (Cron Job)")
        
        monitor = StandaloneMonitor()
        results = await monitor.run_daily_monitoring()
        
        # Send email notification (optional)
        await send_notification(results)
        
        logger.info("✅ Daily monitoring completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Daily monitoring failed: {e}")
        sys.exit(1)

async def send_notification(results):
    """Send email notification with results summary"""
    try:
        # Simple email notification (optional)
        import smtplib
        from email.mime.text import MIMEText
        
        # Count total mentions
        total_mentions = 0
        companies_monitored = len(results)
        
        for company, company_results in results.items():
            if 'error' not in company_results:
                for prompt_key, prompt_data in company_results.items():
                    for model, model_result in prompt_data.get('results', {}).items():
                        total_mentions += model_result.get('ai_mentions', 0)
        
        # Create summary email
        subject = f"PEEC AI Daily Report - {datetime.now().strftime('%Y-%m-%d')}"
        body = f"""
Daily PEEC AI Monitoring Summary

📊 Companies Monitored: {companies_monitored}
🎯 Total Mentions Found: {total_mentions}
📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Results saved to local files.
        """
        
        # Note: Email sending would require SMTP configuration
        logger.info(f"📧 Summary: {companies_monitored} companies, {total_mentions} total mentions")
        
    except Exception as e:
        logger.warning(f"Failed to send notification: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 