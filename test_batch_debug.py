#!/usr/bin/env python3
"""Debug batch test failure"""

import sys
import os
import json
import subprocess
from pathlib import Path

# Get API key from environment variable (never hardcode!)
if 'GEMINI_API_KEY' not in os.environ:
    print("❌ GEMINI_API_KEY environment variable not set")
    sys.exit(1)

# Use same config as batch test
test_input = {
    "primary_keyword": "What is AEO optimization",
    "company_url": "https://scaile.tech",
    "language": "en",
    "country": "US",
    "word_count": 500,
    "tone": "professional",
    "company_context": {
        "company_name": "SCAILE",
        "industry": "AEO Services",
        "products": ["AI Visibility Engine"]
    }
}

print("Testing batch config individually...")
print(json.dumps(test_input, indent=2))

script_path = Path(__file__).parent / 'scripts' / 'generate-blog.py'
proc = subprocess.run(
    ['python3', str(script_path)],
    input=json.dumps(test_input),
    capture_output=True,
    text=True,
    timeout=180
)

print(f"\nExit code: {proc.returncode}")
print(f"\n--- STDOUT (first 2000 chars) ---")
print(proc.stdout[:2000])
print(f"\n--- STDERR (first 2000 chars) ---")
print(proc.stderr[:2000])

if proc.returncode == 0:
    result = json.loads(proc.stdout)
    print(f"\n✅ Success!")
    print(f"HTML length: {len(result.get('html_content', ''))} chars")
else:
    print(f"\n❌ Failed")

