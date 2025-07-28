#!/usr/bin/env python3
"""
PEEC AI - Comprehensive Status Report
"""

import os
import json
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_api_keys():
    """Check if all API keys are configured"""
    print("🔑 API Keys Status")
    print("=" * 40)
    
    keys = {
        "OpenAI": os.getenv("OPENAI_API_KEY"),
        "Gemini": os.getenv("GEMINI_API_KEY"),
        "Perplexity": os.getenv("PERPLEXITY_API_KEY"),
        "Serper": os.getenv("SERPER_API_KEY")
    }
    
    for name, key in keys.items():
        if key and key.startswith("sk_") or key.startswith("AIz_") or key.startswith("pplx_") or len(key) > 20:
            print(f"✅ {name}: Configured")
        else:
            print(f"❌ {name}: Not configured or invalid")
    
    return all(key and (key.startswith("sk_") or key.startswith("AIz_") or key.startswith("pplx_") or len(key) > 20) for key in keys.values())

def test_server_status():
    """Test if the server is running"""
    print("\n🌐 Server Status")
    print("=" * 40)
    
    try:
        import requests
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running on http://localhost:8000")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Server responded with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Server is not running: {e}")
        return False

def test_search_functionality():
    """Test Serper search functionality"""
    print("\n🔍 Search Functionality")
    print("=" * 40)
    
    try:
        import requests
        response = requests.post(
            "http://localhost:8000/api/test/search",
            json={"query": "valoon.chat competitors"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Serper search is working")
            print(f"   Found {data['results_count']} results")
            print(f"   Sample: {data['results'][0]['title']}")
            return True
        else:
            print(f"❌ Search failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Search test failed: {e}")
        return False

def test_llm_functionality():
    """Test LLM functionality"""
    print("\n🤖 LLM Functionality")
    print("=" * 40)
    
    try:
        import requests
        response = requests.post(
            "http://localhost:8000/api/test/prompt",
            json={
                "prompt": "What are the latest developments in AI technology?",
                "company_name": "Test Company",
                "models": ["perplexity"]  # Test with Perplexity first (no rate limits)
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ LLM functionality is working")
            print(f"   Tested models: {list(data['results'].keys())}")
            
            for model, result in data['results'].items():
                print(f"   {model}: {len(result['response'])} chars, {result['search_results_count']} search results")
            return True
        else:
            print(f"❌ LLM test failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ LLM test failed: {e}")
        return False

def check_environment():
    """Check Python environment"""
    print("\n🐍 Environment Status")
    print("=" * 40)
    
    import sys
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    
    # Check if we're in the right conda environment
    if "peecai" in sys.executable:
        print("✅ Running in peecai conda environment")
    else:
        print("❌ Not running in peecai conda environment")
    
    # Check key packages
    packages = ["fastapi", "uvicorn", "google.generativeai", "openai", "perplexity"]
    for package in packages:
        try:
            __import__(package)
            print(f"✅ {package}: Installed")
        except ImportError:
            print(f"❌ {package}: Not installed")

def main():
    """Run comprehensive status check"""
    print("🚀 PEEC AI - Comprehensive Status Report")
    print("=" * 60)
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check environment
    check_environment()
    
    # Check API keys
    api_keys_ok = check_api_keys()
    
    # Check server
    server_ok = test_server_status()
    
    # Check functionality
    search_ok = False
    llm_ok = False
    
    if server_ok:
        search_ok = test_search_functionality()
        llm_ok = test_llm_functionality()
    
    # Summary
    print("\n📊 SUMMARY")
    print("=" * 60)
    print(f"✅ API Keys: {'OK' if api_keys_ok else 'ISSUES'}")
    print(f"✅ Server: {'OK' if server_ok else 'NOT RUNNING'}")
    print(f"✅ Search: {'OK' if search_ok else 'ISSUES'}")
    print(f"✅ LLM: {'OK' if llm_ok else 'ISSUES'}")
    
    if api_keys_ok and server_ok and search_ok and llm_ok:
        print("\n🎉 Everything is working! PEEC AI is ready to use.")
    else:
        print("\n⚠️  Some issues detected. Check the details above.")
    
    print("\n🔧 Next Steps:")
    if not server_ok:
        print("   - Start the server: python main_test.py")
    if not api_keys_ok:
        print("   - Configure missing API keys in .env file")
    if not search_ok:
        print("   - Check Serper API key and connectivity")
    if not llm_ok:
        print("   - Check LLM API keys and rate limits")

if __name__ == "__main__":
    main() 