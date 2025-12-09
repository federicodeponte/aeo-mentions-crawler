#!/usr/bin/env python3
"""
Full keyword generation test with progress tracking
Tests with minimal keywords for faster completion
"""

import requests
import json
import time
import sys
from pathlib import Path

def test_keyword_generation():
    """Test keyword generation with progress tracking"""
    
    print("🧪 Full Keyword Generation Test")
    print("=" * 60)
    
    test_data = {
        "company_name": "SCAILE",
        "company_url": "https://scaile.tech",
        "language": "en",
        "country": "US",
        "num_keywords": 5,  # Small for faster testing
        "enable_google_trends": True,
        "enable_autocomplete": True,
        "description": "AEO services",
        "products": ["AEO Foundation Plan"],
        "target_audience": "B2B SaaS",
    }
    
    print(f"\n📋 Configuration:")
    for key, value in test_data.items():
        print(f"   {key}: {value}")
    
    start_time = time.time()
    last_update = start_time
    
    try:
        print(f"\n🚀 Starting generation...")
        print(f"   (Estimated: 3-5 minutes for 5 keywords)")
        print(f"   Progress: ", end="", flush=True)
        
        response = requests.post(
            "http://localhost:3002/api/generate-keywords",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=600
        )
        
        elapsed = time.time() - start_time
        
        if not response.ok:
            print(f"\n❌ ERROR: HTTP {response.status_code}")
            try:
                error = response.json()
                print(f"   {error.get('error', 'Unknown')}")
            except:
                print(f"   {response.text[:200]}")
            return False
        
        result = response.json()
        keywords = result.get('keywords', [])
        
        print(f"\n✅ SUCCESS in {elapsed:.1f}s ({elapsed/60:.1f} min)")
        print(f"\n📊 Results:")
        print(f"   Keywords: {len(keywords)}")
        print(f"   Generation time: {result.get('metadata', {}).get('generation_time', 'N/A')}")
        
        if keywords:
            print(f"\n🔍 Keywords:")
            for i, kw in enumerate(keywords, 1):
                score = kw.get('score', kw.get('relevance_score', 0))
                print(f"   {i}. {kw.get('keyword', 'N/A')[:70]} (score: {score})")
            
            # Check enhanced data
            print(f"\n📈 Enhanced Data:")
            checks = [
                ('research_data', 'Research'),
                ('content_brief', 'Content Brief'),
                ('serp_data', 'SERP'),
                ('trends_data', 'Trends'),
                ('autocomplete_data', 'Autocomplete'),
            ]
            
            for field, label in checks:
                count = sum(1 for k in keywords if k.get(field))
                print(f"   {label}: {count}/{len(keywords)} ({count/len(keywords)*100:.0f}%)")
        
        # Save results
        output_file = Path(__file__).parent / "test_results_full.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Saved to: {output_file}")
        
        return True
        
    except requests.exceptions.Timeout:
        print(f"\n⏱️  Timeout after {time.time() - start_time:.1f}s")
        return False
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to http://localhost:3002")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = test_keyword_generation()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Cancelled")
        sys.exit(130)

