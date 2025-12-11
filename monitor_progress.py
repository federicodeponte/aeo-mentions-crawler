#!/usr/bin/env python3
"""Monitor blog generation progress"""

import time
import subprocess
import os

def check_processes():
    """Check running blog processes"""
    try:
        result = subprocess.run(
            ["ps", "aux"], 
            capture_output=True, 
            text=True
        )
        
        blog_processes = []
        for line in result.stdout.split('\n'):
            if 'generate-blog.py' in line and 'grep' not in line:
                parts = line.split()
                if len(parts) > 10:
                    pid = parts[1]
                    cpu = parts[2]
                    memory = parts[3]
                    time_running = parts[9]
                    blog_processes.append(f"PID {pid}: CPU {cpu}%, MEM {memory}%, TIME {time_running}")
        
        return blog_processes
    except Exception as e:
        return [f"Error checking processes: {e}"]

def check_files():
    """Check for output files"""
    files = []
    try:
        for filename in os.listdir('.'):
            if 'output' in filename and filename.endswith('.json'):
                stat = os.stat(filename)
                size = stat.st_size
                mtime = time.ctime(stat.st_mtime)
                files.append(f"{filename}: {size} bytes, modified {mtime}")
    except Exception as e:
        files.append(f"Error checking files: {e}")
    
    return files

print("=" * 60)
print("📊 BLOG GENERATION MONITOR")
print("=" * 60)

for i in range(12):  # Monitor for 2 minutes
    print(f"\n⏰ Check #{i+1} ({time.strftime('%H:%M:%S')})")
    
    processes = check_processes()
    if processes:
        print("🔄 Running processes:")
        for p in processes:
            print(f"  {p}")
    else:
        print("✅ No blog generation processes running")
    
    files = check_files()
    if files:
        print("📁 Output files:")
        for f in files:
            print(f"  {f}")
    else:
        print("📁 No output files yet")
    
    time.sleep(10)  # Check every 10 seconds

print("\n" + "=" * 60)
print("Monitor complete")