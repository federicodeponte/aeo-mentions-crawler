#!/usr/bin/env python3
"""
Test with detailed logging to see WHERE the slowness is
"""
import os
import sys
import json
import subprocess
import time
from datetime import datetime

os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

test_config = {
    "primary_keyword": "AEO tips",
    "company_url": "https://scaile.tech",
    "company_name": "SCAILE",
    "language": "en",
    "country": "US",
    "word_count": 500,
    "tone": "professional",
}

print("=" * 70)
print("🔍 DIAGNOSTIC TEST - Track Where Time is Spent")
print("=" * 70)
print(f"\n⏱️  Start: {datetime.now().strftime('%H:%M:%S')}\n")

env = os.environ.copy()
if 'GEMINI_MODEL' in env:
    del env['GEMINI_MODEL']

# Start process with live output
process = subprocess.Popen(
    ['python3', '-u', 'scripts/generate-blog.py'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    env=env
)

# Send input
process.stdin.write(json.dumps(test_config))
process.stdin.close()

# Monitor live
start = time.time()
last_check = start

print("📊 Monitoring (will show progress every 30s):\n")

while process.poll() is None:
    current = time.time()
    elapsed = current - start
    
    if current - last_check >= 30:
        print(f"[{int(elapsed)}s] Still running... ({elapsed/60:.1f} min)")
        last_check = current
    
    time.sleep(5)
    
    # Stop after 2 minutes for diagnosis
    if elapsed > 120:
        print(f"\n⏹️  Stopping after {elapsed:.0f}s for diagnosis")
        process.terminate()
        time.sleep(2)
        if process.poll() is None:
            process.kill()
        break

elapsed = time.time() - start

print(f"\n⏱️  Total: {elapsed:.1f}s")
print("\n" + "=" * 70)
print("📋 STDERR OUTPUT (last 2000 chars):")
print("=" * 70)

stderr = process.stderr.read()
if stderr:
    print(stderr[-2000:])
else:
    print("(no stderr)")

print("\n" + "=" * 70)
print("📋 STDOUT OUTPUT (first 500 chars):")
print("=" * 70)

stdout = process.stdout.read()
if stdout:
    print(stdout[:500])
    if len(stdout) > 500:
        print(f"\n... and {len(stdout) - 500} more characters")
else:
    print("(no stdout)")

print("\n" + "=" * 70)
print("🔍 DIAGNOSIS")
print("=" * 70)

if elapsed > 120:
    print("\n❌ Process took >2 minutes - investigating cause")
    print("\nPossible issues:")
    print("  1. Gemini API call hanging")
    print("  2. Pipeline stage stuck")
    print("  3. Network timeout")
    print("  4. Rate limiting")
    
    if "timeout" in stderr.lower() or "timeout" in stdout.lower():
        print("\n⚠️  FOUND: Timeout in logs")
    if "rate" in stderr.lower() or "limit" in stderr.lower():
        print("\n⚠️  FOUND: Rate limiting")
    if "error" in stderr.lower():
        print("\n⚠️  FOUND: Error in stderr")
else:
    print(f"\n✅ Completed in {elapsed:.1f}s - normal speed!")

print("\n" + "=" * 70)
