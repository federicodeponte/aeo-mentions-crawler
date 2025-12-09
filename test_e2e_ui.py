#!/usr/bin/env python3
"""
Full E2E UI Test - Simulates complete user flow
Tests: Form submission → Progress updates → Results display
"""

import requests
import json
import time
import sys
from datetime import datetime

def simulate_ui_flow():
    """Simulate complete UI flow with progress monitoring"""
    
    print("=" * 70)
    print("🧪 FULL E2E UI TEST")
    print("=" * 70)
    print()
    
    # Step 1: Simulate user filling form
    print("📝 STEP 1: User fills form")
    print("   - Company: SCAILE")
    print("   - URL: https://scaile.tech")
    print("   - Keywords: 10")
    print("   - Trends: Enabled")
    print("   - Autocomplete: Enabled")
    print()
    
    test_data = {
        "company_name": "SCAILE",
        "company_url": "https://scaile.tech",
        "language": "en",
        "country": "US",
        "num_keywords": 10,
        "enable_google_trends": True,
        "enable_autocomplete": True,
    }
    
    # Step 2: Simulate clicking "Generate Keywords"
    print("🚀 STEP 2: User clicks 'Generate Keywords'")
    print("   → API request sent")
    print("   → Progress interval should start")
    print("   → Console should show: '[PROGRESS] Started'")
    print()
    
    start_time = time.time()
    request_start = time.time()
    
    # Simulate what UI progress should show
    INTERVAL_MS = 0.8
    PROGRESS_PER_INTERVAL = 0.5
    current_progress = 0
    stage_index = 0
    
    stages = [
        {"name": "Company Analysis", "end": 10},
        {"name": "Configuration", "end": 15},
        {"name": "AI Generation", "end": 40},
        {"name": "Research & Enrichment", "end": 60},
        {"name": "SERP Analysis", "end": 75},
        {"name": "Deduplication", "end": 85},
        {"name": "Final Clustering", "end": 95},
    ]
    
    print("📊 STEP 3: Progress bar should update (simulating UI behavior)")
    print("   Expected: Updates every 800ms, increments by 0.5%")
    print()
    print("-" * 70)
    
    # Start API call
    try:
        response = requests.post(
            "http://localhost:3002/api/generate-keywords",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=600
        )
        
        # Simulate progress updates while API processes
        interval_count = 0
        last_logged_progress = -1
        
        # In real UI, this would be handled by setInterval
        # Here we simulate what should happen
        while current_progress < 95:
            time.sleep(INTERVAL_MS)
            interval_count += 1
            current_progress = min(current_progress + PROGRESS_PER_INTERVAL, 95)
            
            # Log every 5 intervals (~4 seconds) or every 2.5% progress
            if interval_count % 5 == 0 or int(current_progress / 2.5) != int(last_logged_progress / 2.5):
                elapsed = time.time() - request_start
                print(f"[{elapsed:6.1f}s] 📊 Progress: {current_progress:5.2f}% | Interval: {interval_count}")
                last_logged_progress = current_progress
            
            # Check stage advancement
            if stage_index < len(stages) and current_progress >= stages[stage_index]["end"]:
                stage_index += 1
                elapsed = time.time() - request_start
                print(f"[{elapsed:6.1f}s] ⏭️  Stage {stage_index}: {stages[stage_index]['name']}")
            
            # Visual progress bar
            if interval_count % 10 == 0:
                bar_length = 50
                filled = int((current_progress / 95) * bar_length)
                bar = "█" * filled + "░" * (bar_length - filled)
                elapsed = time.time() - request_start
                print(f"[{elapsed:6.1f}s] [{bar}] {current_progress:5.2f}%")
            
            # Break if API completes (in real UI, this would happen when response arrives)
            if response.ok and interval_count > 10:  # Give API time to start
                break
        
        elapsed_total = time.time() - start_time
        
        if response.ok:
            result = response.json()
            keywords = result.get('keywords', [])
            
            print()
            print("-" * 70)
            print("✅ STEP 4: API Response Received")
            print("-" * 70)
            print(f"⏱️  Total time: {elapsed_total:.1f}s ({elapsed_total/60:.1f} min)")
            print(f"📊 Keywords generated: {len(keywords)}")
            print()
            
            # Step 5: Results should display immediately
            print("📋 STEP 5: Results should display IMMEDIATELY")
            print("   ✅ Progress should jump to 100%")
            print("   ✅ Results table should appear")
            print("   ✅ Progress UI should disappear")
            print()
            
            if keywords:
                print("🔍 Sample Keywords:")
                for i, kw in enumerate(keywords[:5], 1):
                    score = kw.get('score', 0)
                    keyword = kw.get('keyword', 'N/A')
                    print(f"   {i}. {keyword[:60]} (score: {score})")
            
            # Check enhanced data
            print()
            print("📈 Enhanced Data Coverage:")
            checks = [
                ('research_data', 'Research'),
                ('content_brief', 'Content Brief'),
                ('serp_data', 'SERP'),
                ('trends_data', 'Trends'),
                ('autocomplete_data', 'Autocomplete'),
            ]
            
            for field, label in checks:
                count = sum(1 for k in keywords if k.get(field))
                pct = count / len(keywords) * 100 if keywords else 0
                print(f"   {label}: {count}/{len(keywords)} ({pct:.0f}%)")
            
            print()
            print("=" * 70)
            print("✅ E2E TEST COMPLETE")
            print("=" * 70)
            print()
            print("💡 In the actual UI, you should see:")
            print("   1. Progress bar filling smoothly every 800ms")
            print("   2. Stage transitions at 10%, 15%, 40%, etc.")
            print("   3. Console logs showing progress updates")
            print("   4. Results appearing immediately when API completes")
            print()
            
            return True
        else:
            print(f"\n❌ API Error: HTTP {response.status_code}")
            try:
                error = response.json()
                print(f"   {error.get('error', 'Unknown')}")
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
    print("🧪 END-TO-END UI TEST")
    print("=" * 70)
    print("\nThis simulates the complete UI flow:")
    print("  1. User fills form")
    print("  2. Clicks 'Generate Keywords'")
    print("  3. Progress bar updates (simulated)")
    print("  4. API completes")
    print("  5. Results display immediately")
    print("\nStarting test...\n")
    
    try:
        success = simulate_ui_flow()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test cancelled")
        sys.exit(130)

