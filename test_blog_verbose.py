#!/usr/bin/env python3
import json, subprocess, os, sys

# Enable Python logging
os.environ['PYTHONUNBUFFERED'] = '1'

test_config = {
    "primary_keyword": "AEO",
    "company_name": "Test",
    "company_url": "https://test.com",
    "word_count": 400,
    "tone": "informative",
    "language": "en",
    "country": "US"
}

print("🚀 Running with VERBOSE logging enabled...\n")

proc = subprocess.Popen(
    ["python3", "-u", "scripts/generate-blog.py"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1,
    env=os.environ  # Use environment variables only
)

# Send input
proc.stdin.write(json.dumps(test_config))
proc.stdin.close()

print("📊 STDERR OUTPUT (real-time):")
print("=" * 80)
for line in proc.stderr:
    print(line.rstrip())
    sys.stdout.flush()

print("\n" + "=" * 80)
print("📊 STDOUT OUTPUT:")
print("=" * 80)
stdout = proc.stdout.read()
print(stdout[:1000] if len(stdout) > 1000 else stdout)

proc.wait()
print(f"\n✅ Exit code: {proc.returncode}")
