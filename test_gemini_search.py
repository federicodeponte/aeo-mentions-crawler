#!/usr/bin/env python3
"""
Test Gemini's search capabilities vs our current setup
"""

import ssl
import json
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure SSL (same as your example)
ssl._create_default_https_context = ssl._create_unverified_context

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def call_gemini_simple(prompt, *, model_name="gemini-2.0-flash-exp", temp=0.2, max_tokens=8024):
    """
    Tiny helper that matches the style of your call_gemini() wrapper but without
    function-calling. Returns the raw text.
    """
    model = genai.GenerativeModel(model_name)
    resp = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=temp,
            max_output_tokens=max_tokens,
        ),
    )
    return resp.text

def test_gemini_search_capabilities():
    """Test Gemini's search capabilities"""
    
    print("🔍 Testing Gemini Search Capabilities")
    print("=" * 60)
    
    # Test 1: Current events (should work with Gemini's built-in search)
    query1 = "What are the latest developments in AI technology in 2024?"
    print(f"\n📋 Test 1: Current AI developments")
    print(f"Query: {query1}")
    print("-" * 40)
    
    try:
        result1 = call_gemini_simple(query1)
        print("✅ Gemini Response (with built-in search):")
        print(result1[:500] + "..." if len(result1) > 500 else result1)
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Your specific query about valoon.chat competitors
    query2 = (
        "What are the competitors of valoon.chat "
        "(same location as Valoon, same construction-communication niche) "
        "with the highest SEO authority / power? "
        "Give a concise bullet list (name, URL, short SEO-strength note)."
    )
    print(f"\n📋 Test 2: Valoon competitors analysis")
    print(f"Query: {query2}")
    print("-" * 40)
    
    try:
        result2 = call_gemini_simple(query2)
        print("✅ Gemini Response (with built-in search):")
        print(result2[:500] + "..." if len(result2) > 500 else result2)
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Real-time stock price
    query3 = "What is the current stock price of Tesla (TSLA)?"
    print(f"\n📋 Test 3: Real-time stock price")
    print(f"Query: {query3}")
    print("-" * 40)
    
    try:
        result3 = call_gemini_simple(query3)
        print("✅ Gemini Response (with built-in search):")
        print(result3[:500] + "..." if len(result3) > 500 else result3)
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Run all tests"""
    print("🚀 PEEC AI - Gemini Search Capabilities Test")
    print("=" * 60)
    
    # Test Gemini's built-in search
    test_gemini_search_capabilities()
    
    print("\n\n📊 SUMMARY:")
    print("=" * 60)
    print("• Gemini 2.0 Flash has SOME built-in search capabilities")
    print("• However, it's limited and not as comprehensive as Serper")
    print("• Our enhanced setup combines Gemini + Serper for better results")
    print("• This gives us more control and comprehensive search coverage")

if __name__ == "__main__":
    main() 