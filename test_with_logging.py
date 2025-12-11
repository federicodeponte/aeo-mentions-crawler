#!/usr/bin/env python3
"""Test blog generation with full logging visibility"""
import json, subprocess, os, sys, time, threading

test_config = {
    "primary_keyword": "AEO",
    "company_name": "Test",
    "company_url": "https://test.com",
    "word_count": 400,
    "tone": "informative",
    "language": "en",
    "country": "US"
}

print("=" * 80)
print("🚀 BLOG GENERATION WITH FULL LOGGING")
print("=" * 80)
print(f"\n📝 Config: {test_config['primary_keyword']} ({test_config['word_count']} words)\n")

proc = subprocess.Popen(
    ["python3", "-u", "scripts/generate-blog.py"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1,
    env=os.environ  # Use environment variables only
)

# Send input and close
proc.stdin.write(json.dumps(test_config) + '\n')
proc.stdin.close()

# Monitor both stderr and stdout
stderr_lines = []
stdout_lines = []

def read_stderr():
    for line in proc.stderr:
        stderr_lines.append(line.rstrip())
        print(f"[LOG] {line.rstrip()}")
        sys.stdout.flush()

def read_stdout():
    for line in proc.stdout:
        stdout_lines.append(line.rstrip())

# Start reader threads
stderr_thread = threading.Thread(target=read_stderr, daemon=True)
stdout_thread = threading.Thread(target=read_stdout, daemon=True)
stderr_thread.start()
stdout_thread.start()

# Wait with timeout
start_time = time.time()
timeout = 900  # 15 minutes for full pipeline

while proc.poll() is None:
    elapsed = time.time() - start_time
    if elapsed > timeout:
        print(f"\n⏰ Timeout after {timeout}s!")
        proc.terminate()
        break
    time.sleep(1)

# Give threads time to finish
stderr_thread.join(timeout=2)
stdout_thread.join(timeout=2)

elapsed = time.time() - start_time
print(f"\n" + "=" * 80)
print(f"⏱️  Total time: {elapsed:.1f}s")
print(f"✅ Exit code: {proc.returncode}")
print("=" * 80)

# Parse stdout
if stdout_lines:
    stdout_text = '\n'.join(stdout_lines)
    try:
        result = json.loads(stdout_text)
        print(f"\n📊 RESULT:")
        print(f"   Success: {result.get('success')}")
        print(f"   Headline: {result.get('headline', 'N/A')}")
        print(f"   HTML Length: {len(result.get('html_content', '')):,} chars")
        print(f"   Word Count: {result.get('word_count', 0):,}")
    except:
        print(f"\n⚠️  Could not parse stdout as JSON")
        print(f"First 500 chars: {stdout_text[:500]}")
else:
    print("\n⚠️  No stdout output")
