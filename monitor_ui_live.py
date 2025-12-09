#!/usr/bin/env python3
"""
Live UI Progress Monitor
Watches for keyword generation requests and monitors progress
"""

import time
import json
import sys
from datetime import datetime

def monitor_ui():
    """Monitor UI progress by watching what should happen"""
    
    print("=" * 70)
    print("🔍 LIVE UI PROGRESS MONITOR")
    print("=" * 70)
    print()
    print("📋 INSTRUCTIONS:")
    print("   1. Open http://localhost:3002/keywords in your browser")
    print("   2. Open browser console (F12 → Console tab)")
    print("   3. Click 'Generate Keywords'")
    print("   4. Watch for these console logs:")
    print()
    print("   Expected logs:")
    print("   ✅ [PROGRESS] ✅ Started interval: [id] | Updates every 800ms")
    print("   ✅ [PROGRESS] X.XX% (interval: N) - every ~8 seconds")
    print("   ✅ [PROGRESS STATE] React re-rendered with progress: X.XX%")
    print("   ✅ [PROGRESS] ⏭️  Advanced to stage N - [stage name]")
    print()
    print("=" * 70)
    print("⏱️  MONITORING... (Press Ctrl+C to stop)")
    print("=" * 70)
    print()
    
    # Simulate what should happen
    INTERVAL_MS = 0.8
    PROGRESS_PER_INTERVAL = 0.25
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
    
    start_time = time.time()
    interval_count = 0
    
    try:
        while current_progress < 95:
            time.sleep(INTERVAL_MS)
            interval_count += 1
            current_progress = min(current_progress + PROGRESS_PER_INTERVAL, 95)
            
            # Check stage advancement
            if stage_index < len(stages) and current_progress >= stages[stage_index]["end"]:
                stage_index += 1
                elapsed = time.time() - start_time
                print(f"[{elapsed:6.1f}s] ⏭️  Stage {stage_index}: {stages[stage_index]['name']}")
            
            # Log every 10 intervals (~8 seconds) or every 2.5%
            if interval_count % 10 == 0 or int(current_progress / 2.5) != int((current_progress - PROGRESS_PER_INTERVAL) / 2.5):
                elapsed = time.time() - start_time
                print(f"[{elapsed:6.1f}s] 📊 Progress: {current_progress:5.2f}% | Interval: {interval_count}")
            
            # Show progress bar visualization
            if interval_count % 20 == 0:  # Every ~16 seconds
                bar_length = 50
                filled = int((current_progress / 95) * bar_length)
                bar = "█" * filled + "░" * (bar_length - filled)
                elapsed = time.time() - start_time
                print(f"[{elapsed:6.1f}s] [{bar}] {current_progress:5.2f}%")
        
        elapsed_total = time.time() - start_time
        print()
        print("=" * 70)
        print("✅ SIMULATION COMPLETE")
        print("=" * 70)
        print(f"⏱️  Total time: {elapsed_total:.1f}s ({elapsed_total/60:.1f} min)")
        print(f"📊 Final progress: {current_progress:.2f}%")
        print(f"🔄 Total intervals: {interval_count}")
        print()
        print("💡 In the actual UI, you should see:")
        print("   - Progress bar filling smoothly")
        print("   - Stage transitions")
        print("   - Console logs matching this output")
        print()
        
    except KeyboardInterrupt:
        elapsed = time.time() - start_time
        print()
        print(f"\n⚠️  Monitoring stopped after {elapsed:.1f}s")
        print(f"   Progress reached: {current_progress:.2f}%")
        print(f"   Intervals executed: {interval_count}")

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🧪 UI PROGRESS BAR MONITOR")
    print("=" * 70)
    print("\nThis simulates what the UI progress bar SHOULD do.")
    print("Compare this output with what you see in the browser console.\n")
    
    try:
        monitor_ui()
    except KeyboardInterrupt:
        print("\n\n⚠️  Monitoring cancelled")
        sys.exit(130)

