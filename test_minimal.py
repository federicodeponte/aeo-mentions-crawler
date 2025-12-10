#!/usr/bin/env python3
"""
MINIMAL TEST - Absolute shortest config to get ANY successful output
"""

import os
import sys
import json
import subprocess
from datetime import datetime

os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

# ABSOLUTE MINIMUM CONFIG
test_config = {
    "primary_keyword": "AEO",  # Shortest possible
    "company_url": "https://scaile.tech",
    "company_name": "SCAILE",
    "language": "en",
    "country": "US",
    "word_count": 400,  # Minimum
    "tone": "professional",
}

print("=" * 70)
print("🔬 MINIMAL TEST - Get Engine Running")
print("=" * 70)
print(f"\nKeyword: '{test_config['primary_keyword']}' (shortest)")
print(f"Target: {test_config['word_count']} words (minimum)")
print(f"Model: gemini-3-pro-preview")
print("\n⏳ Starting...\n")

start_time = datetime.now()

try:
    env = os.environ.copy()
    if 'GEMINI_MODEL' in env:
        del env['GEMINI_MODEL']
    
    print("📞 Calling scripts/generate-blog.py...")
    result = subprocess.run(
        ['python3', 'scripts/generate-blog.py'],
        input=json.dumps(test_config),
        capture_output=True,
        text=True,
        timeout=480,  # 8 minutes - very generous
        env=env
    )
    
    duration = (datetime.now() - start_time).total_seconds()
    
    print(f"\n⏱️  Completed in {duration:.1f}s\n")
    
    if result.returncode != 0:
        print(f"❌ Exit code: {result.returncode}")
        print(f"\nSTDERR:\n{result.stderr}")
        print(f"\nSTDOUT:\n{result.stdout[:1000]}")
        sys.exit(1)
    
    output = json.loads(result.stdout)
    
    # Save
    with open('test_minimal_output.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    with open('test_minimal_output.html', 'w') as f:
        f.write(output.get('html_content', ''))
    
    print("✅ SUCCESS!\n")
    print("=" * 70)
    print("OUTPUT SUMMARY")
    print("=" * 70)
    print(f"\nHeadline: {output.get('headline', 'N/A')}")
    print(f"Words: {output.get('word_count', 0)}")
    print(f"HTML: {len(output.get('html_content', '')):,} chars")
    print(f"Citations: {output.get('citations_count', 0)}")
    print(f"FAQ: {output.get('faq_count', 0)}")
    print(f"TOC: {len(output.get('toc', {}))}")
    print(f"AEO Score: {output.get('aeo_score', 'N/A')}")
    
    print(f"\n📄 Files:")
    print(f"   - test_minimal_output.json")
    print(f"   - test_minimal_output.html")
    
    print("\n" + "=" * 70)
    print("🎉 ENGINE IS WORKING!")
    print("=" * 70)
    
except subprocess.TimeoutExpired:
    duration = (datetime.now() - start_time).total_seconds()
    print(f"\n❌ Timeout after {duration:.1f}s")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

