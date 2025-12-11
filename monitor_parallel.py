#!/usr/bin/env python3
"""Monitor parallel blog generation progress"""

import time
import subprocess
import json
import os

def check_log_files():
    """Check for output and log files"""
    files_found = []
    try:
        for filename in os.listdir('.'):
            if 'batch' in filename and (filename.endswith('.log') or filename.endswith('.json')):
                stat = os.stat(filename)
                size = stat.st_size
                mtime = time.ctime(stat.st_mtime)
                files_found.append(f"{filename}: {size} bytes, modified {mtime}")
    except Exception as e:
        files_found.append(f"Error checking files: {e}")
    
    return files_found

print("=" * 70)
print("📊 PARALLEL BLOG GENERATION MONITOR")
print("=" * 70)

for i in range(20):  # Monitor for 5+ minutes
    print(f"\n⏰ Check #{i+1} ({time.strftime('%H:%M:%S')})")
    
    # Check main batch process
    try:
        batch_result = subprocess.run(["ps", "-p", "61823"], capture_output=True, text=True)
        if batch_result.returncode == 0:
            print("✅ Parallel batch process (61823) still running")
        else:
            print("❌ Parallel batch process (61823) has finished")
    except:
        print("❌ Could not check batch process")
    
    # Check blog generation processes
    try:
        ps_result = subprocess.run(["ps", "aux"], capture_output=True, text=True)
        blog_processes = []
        for line in ps_result.stdout.split('\n'):
            if 'generate-blog.py' in line and 'grep' not in line:
                parts = line.split()
                if len(parts) > 10:
                    pid = parts[1]
                    cpu = parts[2] 
                    memory = parts[3]
                    time_running = parts[9]
                    blog_processes.append(f"  PID {pid}: CPU {cpu}%, MEM {memory}%, TIME {time_running}")
        
        if blog_processes:
            print(f"🔄 {len(blog_processes)} blog generation process(es) running:")
            for process in blog_processes:
                print(process)
        else:
            print("🔄 No blog generation processes detected")
    except:
        print("❌ Could not check blog processes")
    
    # Check files
    files = check_log_files()
    if files:
        print("📁 Recent batch files:")
        for f in files[-3:]:  # Show last 3 files
            print(f"  {f}")
    
    # Check if we have output
    if os.path.exists('test_full_batch_output.json'):
        try:
            with open('test_full_batch_output.json', 'r') as f:
                content = f.read()
                if content:
                    data = json.loads(content)
                    if isinstance(data, dict) and 'results' in data:
                        print(f"✅ BATCH COMPLETE! Generated {len(data['results'])} blogs")
                        for i, result in enumerate(data['results'], 1):
                            status = "✅" if result.get('success') else "❌"
                            headline = result.get('headline', 'N/A')[:50] + "..."
                            word_count = result.get('word_count', 0)
                            print(f"  {i}. {status} {headline} ({word_count} words)")
                        break
                    else:
                        print(f"🔄 Partial output detected: {content[:100]}...")
        except:
            print("📄 Output file exists but couldn't parse")
    
    time.sleep(15)  # Check every 15 seconds

print("\n" + "=" * 70)
print("Monitor complete")