#!/usr/bin/env python3
"""Quick test of openlogo integration with three-tier system."""
import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env.local")

from company_service import fetch_logo

async def test_logo():
    """Test logo detection with a well-known company."""
    # Test with Stripe (should hit Clearbit immediately)
    test_url = "https://stripe.com"
    
    print(f"🧪 Testing logo detection for: {test_url}")
    print("   Expected: Clearbit API (fast, ~100ms)")
    print()
    
    result = await fetch_logo(test_url)
    
    if result:
        print(f"✅ Logo found!")
        print(f"   URL: {result.url}")
        print(f"   Confidence: {result.confidence:.2f}")
        print(f"   Description: {result.description}")
        print(f"   Is Header: {result.is_header}")
        
        # Check if it's Clearbit (fast path)
        if "clearbit.com" in result.url:
            print()
            print("🎯 SUCCESS: Used Clearbit API (tier 1)")
        elif "google.com/s2/favicons" in result.url:
            print()
            print("🔄 Used Google Favicon (tier 2)")
        else:
            print()
            print("🤖 Used AI Crawler (tier 3)")
    else:
        print("❌ No logo found")

if __name__ == "__main__":
    asyncio.run(test_logo())

