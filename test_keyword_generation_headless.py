#!/usr/bin/env python3
"""
Headless test for keyword generation API
Tests the full flow without UI
"""

import requests
import json
import time
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

def test_keyword_generation():
    """Test the keyword generation API endpoint"""
    
    print("🧪 Testing Keyword Generation API (Headless)")
    print("=" * 60)
    
    # Test configuration
    test_data = {
        "company_name": "SCAILE",
        "company_url": "https://scaile.tech",
        "language": "en",
        "country": "US",
        "num_keywords": 10,  # Small number for faster testing
        "enable_google_trends": True,
        "enable_autocomplete": True,
        # Minimal context for testing
        "description": "AEO (Answer Engine Optimization) services",
        "products": ["AEO Foundation Plan", "Weekly AI Visibility Reports"],
        "target_audience": "B2B SaaS companies",
    }
    
    print(f"\n📋 Test Configuration:")
    print(f"   Company: {test_data['company_name']}")
    print(f"   URL: {test_data['company_url']}")
    print(f"   Keywords: {test_data['num_keywords']}")
    print(f"   Trends: {test_data['enable_google_trends']}")
    print(f"   Autocomplete: {test_data['enable_autocomplete']}")
    
    # Start timer
    start_time = time.time()
    
    try:
        print(f"\n🚀 Sending request to /api/generate-keywords...")
        print(f"   (This will take ~5-7 minutes)")
        
        response = requests.post(
            "http://localhost:3002/api/generate-keywords",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=600  # 10 minute timeout
        )
        
        elapsed = time.time() - start_time
        
        print(f"\n⏱️  Request completed in {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")
        
        if not response.ok:
            print(f"\n❌ ERROR: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text[:500]}")
            return False
        
        # Parse response
        result = response.json()
        
        print(f"\n✅ SUCCESS!")
        print(f"\n📊 Results Summary:")
        print(f"   Keywords generated: {len(result.get('keywords', []))}")
        print(f"   Generation time: {result.get('metadata', {}).get('generation_time', 'N/A')}")
        
        # Check keyword quality
        keywords = result.get('keywords', [])
        if keywords:
            print(f"\n🔍 Sample Keywords (first 5):")
            for i, kw in enumerate(keywords[:5], 1):
                score = kw.get('score', kw.get('relevance_score', 0))
                intent = kw.get('intent', kw.get('search_intent', 'unknown'))
                print(f"   {i}. {kw.get('keyword', 'N/A')[:60]} (score: {score}, intent: {intent})")
            
            # Check enhanced data
            print(f"\n📈 Enhanced Data Coverage:")
            has_research = sum(1 for k in keywords if k.get('research_data'))
            has_content_brief = sum(1 for k in keywords if k.get('content_brief'))
            has_serp_data = sum(1 for k in keywords if k.get('serp_data'))
            has_trends = sum(1 for k in keywords if k.get('trends_data'))
            has_autocomplete = sum(1 for k in keywords if k.get('autocomplete_data'))
            
            print(f"   Research data: {has_research}/{len(keywords)} ({has_research/len(keywords)*100:.0f}%)")
            print(f"   Content briefs: {has_content_brief}/{len(keywords)} ({has_content_brief/len(keywords)*100:.0f}%)")
            print(f"   SERP data: {has_serp_data}/{len(keywords)} ({has_serp_data/len(keywords)*100:.0f}%)")
            print(f"   Trends data: {has_trends}/{len(keywords)} ({has_trends/len(keywords)*100:.0f}%)")
            print(f"   Autocomplete data: {has_autocomplete}/{len(keywords)} ({has_autocomplete/len(keywords)*100:.0f}%)")
        
        # Save results
        output_file = Path(__file__).parent / "test_output_headless.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Full results saved to: {output_file}")
        
        return True
        
    except requests.exceptions.Timeout:
        elapsed = time.time() - start_time
        print(f"\n⏱️  Request timed out after {elapsed:.1f} seconds")
        print(f"   (This is expected if generation takes >10 minutes)")
        return False
        
    except requests.exceptions.ConnectionError:
        print(f"\n❌ ERROR: Could not connect to http://localhost:3002")
        print(f"   Make sure the Next.js dev server is running:")
        print(f"   cd content-manager && npm run dev -- --port 3002")
        return False
        
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"\n❌ ERROR after {elapsed:.1f} seconds:")
        print(f"   {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🧪 HEADLESS KEYWORD GENERATION TEST")
    print("=" * 60)
    print("\n⚠️  This test will:")
    print("   1. Call the keyword generation API")
    print("   2. Wait for full completion (~5-7 minutes)")
    print("   3. Verify results and enhanced data")
    print("\n💡 Make sure the dev server is running on port 3002")
    print("   Press Ctrl+C to cancel\n")
    
    try:
        success = test_keyword_generation()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test cancelled by user")
        sys.exit(130)

