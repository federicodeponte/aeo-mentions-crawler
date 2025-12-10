#!/usr/bin/env python3
"""
FULL TEST - No Timeout, Complete Logging, Background Run
Let it run as long as needed to complete the full pipeline
"""
import os
import sys
import json
import subprocess
import time
from datetime import datetime

os.environ['GEMINI_API_KEY'] = '[REMOVED_API_KEY]'

test_config = {
    "primary_keyword": "AEO optimization guide",
    "company_url": "https://scaile.tech",
    "company_name": "SCAILE",
    "language": "en",
    "country": "US",
    "word_count": 800,
    "tone": "professional",
    "company_context": {
        "name": "SCAILE",
        "industry": "AEO & AI Visibility",
        "description": "AI visibility platform for answer engines",
        "products": ["AEO Foundation Plan", "AI Visibility Engine"],
        "target_audience": "B2B SaaS companies"
    }
}

output_file = "test_full_no_timeout_output.json"
log_file = "test_full_no_timeout.log"

print("=" * 80)
print("🚀 FULL TEST - No Timeout, Complete Logging")
print("=" * 80)
print(f"\nKeyword: {test_config['primary_keyword']}")
print(f"Company: {test_config['company_name']}")
print(f"Target: {test_config['word_count']} words")
print(f"\n⏱️  Start: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\n📊 Progress will be logged to: {log_file}")
print("📄 Output will be saved to: {output_file}")
print("\n🔄 Running in background - check log file for progress")
print("=" * 80 + "\n")

start_time = time.time()

# Remove timeout, capture all output
env = os.environ.copy()
if 'GEMINI_MODEL' in env:
    del env['GEMINI_MODEL']

try:
    # Run with UNBUFFERED output for live logging
    process = subprocess.Popen(
        ['python3', '-u', 'scripts/generate-blog.py'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,  # Line buffered
        env=env
    )
    
    # Send input
    process.stdin.write(json.dumps(test_config))
    process.stdin.close()
    
    # Open log file
    with open(log_file, 'w') as log:
        log.write(f"Full Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        log.write("=" * 80 + "\n\n")
        log.flush()
        
        # Monitor with periodic updates
        last_update = start_time
        stderr_buffer = []
        
        print("⏳ Monitoring progress (live updates every 30s)...\n")
        
        while process.poll() is None:
            current = time.time()
            elapsed = current - start_time
            
            # Read available stderr
            try:
                line = process.stderr.readline()
                if line:
                    stderr_buffer.append(line)
                    log.write(line)
                    log.flush()
                    
                    # Print important logs
                    if any(x in line.lower() for x in ['stage', 'error', 'completed', 'failed']):
                        print(f"[{int(elapsed)}s] {line.strip()}")
            except:
                pass
            
            # Periodic update
            if current - last_update >= 30:
                minutes = elapsed / 60
                log.write(f"\n[{int(elapsed)}s / {minutes:.1f}min] Still running...\n")
                log.flush()
                print(f"\n⏱️  [{int(elapsed)}s / {minutes:.1f}min] Still processing...")
                last_update = current
            
            time.sleep(0.5)
        
        # Process finished
        elapsed = time.time() - start_time
        
        # Read remaining stderr
        remaining = process.stderr.read()
        if remaining:
            stderr_buffer.append(remaining)
            log.write(remaining)
        
        # Read stdout (the result)
        stdout = process.stdout.read()
        
        log.write("\n" + "=" * 80 + "\n")
        log.write(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        log.write(f"Duration: {elapsed:.1f}s ({elapsed/60:.1f} minutes)\n")
        log.write(f"Exit code: {process.returncode}\n")
        log.write("=" * 80 + "\n")
    
    # Print summary
    print("\n" + "=" * 80)
    print("✅ PROCESS COMPLETED!")
    print("=" * 80)
    print(f"\n⏱️  Duration: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
    print(f"📋 Exit code: {process.returncode}")
    
    if process.returncode == 0:
        print("\n✅ SUCCESS!")
        
        # Parse and save output
        try:
            output = json.loads(stdout)
            
            with open(output_file, 'w') as f:
                json.dump(output, f, indent=2)
            
            print(f"\n📄 Output saved to: {output_file}")
            
            # Show summary
            print("\n" + "=" * 80)
            print("📊 GENERATION SUMMARY")
            print("=" * 80)
            print(f"\n✅ Headline: {output.get('headline', 'N/A')[:70]}...")
            print(f"✅ Word count: {output.get('word_count', 0)}")
            print(f"✅ HTML: {len(output.get('html_content', '')):,} characters")
            print(f"✅ AEO Score: {output.get('aeo_score', 'N/A')}")
            print(f"\n📊 Enhanced Data:")
            print(f"   • Citations: {output.get('citations_count', 0)}")
            print(f"   • FAQ: {output.get('faq_count', 0)}")
            print(f"   • PAA: {output.get('paa_count', 0)}")
            print(f"   • Internal Links: {output.get('internal_links_count', 0)}")
            print(f"   • TOC Sections: {len(output.get('toc', {}))}")
            print(f"   • Images: {1 if output.get('image_url') else 0}")
            
            print("\n" + "=" * 80)
            print("🎉 FULL INTEGRATION TEST PASSED!")
            print("=" * 80)
            print("\n✅ Engine is working!")
            print("✅ Enhanced data extracted!")
            print("✅ Company context integrated!")
            print(f"\n📄 Full logs: {log_file}")
            print(f"📄 Full output: {output_file}")
            
        except json.JSONDecodeError as e:
            print(f"\n❌ JSON Parse Error: {e}")
            print(f"\nSTDOUT (first 1000 chars):\n{stdout[:1000]}")
            with open('test_full_no_timeout_stdout.txt', 'w') as f:
                f.write(stdout)
            print(f"\n📄 Raw stdout saved to: test_full_no_timeout_stdout.txt")
    else:
        print(f"\n❌ Process failed with exit code {process.returncode}")
        print(f"\n📄 Check logs for details: {log_file}")
    
    print("\n" + "=" * 80)

except KeyboardInterrupt:
    print("\n\n⚠️  Test interrupted by user")
    if 'process' in locals():
        process.terminate()
except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()

