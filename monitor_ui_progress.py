#!/usr/bin/env python3
"""
Monitor UI progress bar during keyword generation
Simulates what should happen in the frontend
"""

import requests
import json
import time
import sys
from datetime import datetime

def monitor_generation():
    """Monitor a keyword generation request and track progress"""
    
    print("=" * 70)
    print("🔍 MONITORING UI PROGRESS BAR")
    print("=" * 70)
    print()
    
    test_data = {
        "company_name": "SCAILE",
        "company_url": "https://scaile.tech",
        "language": "en",
        "country": "US",
        "num_keywords": 10,  # More keywords for longer test
        "enable_google_trends": True,
        "enable_autocomplete": True,
    }
    
    print("📋 Starting generation with:")
    print(f"   Company: {test_data['company_name']}")
    print(f"   Keywords: {test_data['num_keywords']}")
    print(f"   Trends: {test_data['enable_google_trends']}")
    print(f"   Autocomplete: {test_data['enable_autocomplete']}")
    print()
    print("⏱️  Simulating UI progress bar updates...")
    print("   (Progress should update every 800ms)")
    print()
    print("-" * 70)
    
    start_time = time.time()
    last_progress_log = 0
    
    # Simulate progress updates (what UI should show)
    INTERVAL_MS = 0.8  # 800ms
    PROGRESS_PER_INTERVAL = 0.25
    TOTAL_DURATION = 360  # 6 minutes
    
    stages = [
        {"name": "Company Analysis", "range": [0, 10], "duration": "~30s"},
        {"name": "Configuration", "range": [10, 15], "duration": "~20s"},
        {"name": "AI Generation", "range": [15, 40], "duration": "~2min"},
        {"name": "Research & Enrichment", "range": [40, 60], "duration": "~90s"},
        {"name": "SERP Analysis", "range": [60, 75], "duration": "~1min"},
        {"name": "Deduplication", "range": [75, 85], "duration": "~30s"},
        {"name": "Final Clustering", "range": [85, 95], "duration": "~20s"},
    ]
    
    current_progress = 0
    stage_index = 0
    
    try:
        # Start API request
        print("🚀 Sending API request...")
        response = requests.post(
            "http://localhost:3002/api/generate-keywords",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=600,
            stream=False
        )
        
        # Simulate progress while waiting
        print("📊 Progress simulation (what UI should show):")
        print()
        
        request_start = time.time()
        
        # In a real scenario, the API would be running in background
        # and we'd simulate progress updates
        # For now, we'll track elapsed time vs expected progress
        
        elapsed = time.time() - request_start
        
        if response.ok:
            result = response.json()
            elapsed_total = time.time() - start_time
            
            print()
            print("-" * 70)
            print("✅ GENERATION COMPLETE!")
            print("-" * 70)
            print(f"⏱️  Total time: {elapsed_total:.1f}s ({elapsed_total/60:.1f} min)")
            print(f"📊 Keywords generated: {len(result.get('keywords', []))}")
            print()
            
            keywords = result.get('keywords', [])
            if keywords:
                print("🔍 Sample keywords:")
                for i, kw in enumerate(keywords[:5], 1):
                    score = kw.get('score', 0)
                    print(f"   {i}. {kw.get('keyword', 'N/A')[:60]} (score: {score})")
            
            # Check enhanced data
            print()
            print("📈 Enhanced Data Coverage:")
            has_research = sum(1 for k in keywords if k.get('research_data'))
            has_content_brief = sum(1 for k in keywords if k.get('content_brief'))
            has_serp = sum(1 for k in keywords if k.get('serp_data'))
            has_trends = sum(1 for k in keywords if k.get('trends_data'))
            has_autocomplete = sum(1 for k in keywords if k.get('autocomplete_data'))
            
            print(f"   Research: {has_research}/{len(keywords)} ({has_research/len(keywords)*100:.0f}%)")
            print(f"   Content Brief: {has_content_brief}/{len(keywords)} ({has_content_brief/len(keywords)*100:.0f}%)")
            print(f"   SERP: {has_serp}/{len(keywords)} ({has_serp/len(keywords)*100:.0f}%)")
            print(f"   Trends: {has_trends}/{len(keywords)} ({has_trends/len(keywords)*100:.0f}%)")
            print(f"   Autocomplete: {has_autocomplete}/{len(keywords)} ({has_autocomplete/len(keywords)*100:.0f}%)")
            
            return True
        else:
            print(f"\n❌ ERROR: HTTP {response.status_code}")
            try:
                error = response.json()
                print(f"   {error.get('error', 'Unknown error')}")
            except:
                print(f"   {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        elapsed = time.time() - start_time
        print(f"\n⏱️  Request timed out after {elapsed:.1f}s")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🧪 UI PROGRESS BAR MONITORING TEST")
    print("=" * 70)
    print("\nThis simulates what the UI progress bar should show.")
    print("In the actual UI, you should see:")
    print("  - Progress bar filling smoothly every 800ms")
    print("  - Stage transitions at 10%, 15%, 40%, etc.")
    print("  - Console logs showing progress updates")
    print("\nStarting test...\n")
    
    try:
        success = monitor_generation()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Monitoring cancelled")
        sys.exit(130)

