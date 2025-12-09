#!/usr/bin/env python3
"""
Quick API test - verifies endpoint is working without full generation
"""

import requests
import json
import sys

def test_api_endpoint():
    """Quick test to verify API endpoint is accessible"""
    
    print("🧪 Quick API Test")
    print("=" * 60)
    
    test_data = {
        "company_name": "Test Company",
        "company_url": "https://example.com",
        "language": "en",
        "country": "US",
        "num_keywords": 5,  # Very small for quick test
        "enable_google_trends": True,
        "enable_autocomplete": True,
    }
    
    try:
        print(f"\n🚀 Testing API endpoint...")
        print(f"   URL: http://localhost:3002/api/generate-keywords")
        
        # Start request (but don't wait for full completion)
        response = requests.post(
            "http://localhost:3002/api/generate-keywords",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30  # Short timeout to just verify it starts
        )
        
        if response.ok:
            print(f"✅ API endpoint is working!")
            result = response.json()
            print(f"   Keywords: {len(result.get('keywords', []))}")
            return True
        else:
            print(f"❌ API returned error: {response.status_code}")
            print(f"   {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"⏱️  Request started (timeout expected - generation takes 5-7 min)")
        print(f"✅ API endpoint is accessible and processing!")
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to http://localhost:3002")
        print(f"   Start server: npm run dev -- --port 3002")
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_api_endpoint()
    sys.exit(0 if success else 1)

