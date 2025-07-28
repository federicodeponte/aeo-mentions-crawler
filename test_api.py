#!/usr/bin/env python3
"""
Test script for PEEC AI Backend API
Run this to test the basic functionality
"""

import asyncio
import httpx
import json
from typing import Dict, Any

# API base URL
BASE_URL = "http://localhost:8000"

async def test_health():
    """Test health endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200

async def test_companies():
    """Test company endpoints"""
    async with httpx.AsyncClient() as client:
        # Get companies
        response = await client.get(f"{BASE_URL}/api/companies")
        print(f"Get companies: {response.status_code}")
        companies = response.json()
        print(f"Found {len(companies)} companies")
        
        if companies:
            # Test getting specific company
            company_id = companies[0]["id"]
            response = await client.get(f"{BASE_URL}/api/companies/{company_id}")
            print(f"Get company {company_id}: {response.status_code}")
            print(f"Company: {response.json()}")
        
        return True

async def test_prompts():
    """Test prompt endpoints"""
    async with httpx.AsyncClient() as client:
        # Get prompts
        response = await client.get(f"{BASE_URL}/api/prompts")
        print(f"Get prompts: {response.status_code}")
        prompts = response.json()
        print(f"Found {len(prompts)} prompts")
        
        if prompts:
            # Test getting prompts for specific company
            company_id = prompts[0]["company_id"]
            response = await client.get(f"{BASE_URL}/api/prompts?company_id={company_id}")
            print(f"Get prompts for company {company_id}: {response.status_code}")
            company_prompts = response.json()
            print(f"Found {len(company_prompts)} prompts for company")
        
        return True

async def test_prompt_processing():
    """Test prompt processing with LLM models"""
    async with httpx.AsyncClient() as client:
        test_data = {
            "prompt": "What are the latest developments in sustainable building materials?",
            "company_name": "Planeco Building",
            "models": ["chatgpt", "gemini", "perplexity"]
        }
        
        print("Testing prompt processing...")
        print(f"Prompt: {test_data['prompt']}")
        print(f"Company: {test_data['company_name']}")
        
        response = await client.post(
            f"{BASE_URL}/api/test/prompt",
            json=test_data,
            timeout=120.0  # 2 minutes timeout
        )
        
        print(f"Prompt processing: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Results:")
            for model, model_result in result["results"].items():
                print(f"\n{model.upper()}:")
                if "error" in model_result:
                    print(f"  Error: {model_result['error']}")
                else:
                    print(f"  AI Mentions: {model_result['ai_mentions']}")
                    print(f"  Source Mentions: {model_result['source_mentions']}")
                    print(f"  Links found: {len(model_result['links'])}")
                    print(f"  Response length: {len(model_result['response'])} characters")
        else:
            print(f"Error: {response.text}")
        
        return response.status_code == 200

async def test_monitoring_status():
    """Test monitoring status endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/monitoring/status")
        print(f"Monitoring status: {response.status_code}")
        status = response.json()
        print(f"Status: {status}")
        return response.status_code == 200

async def test_results():
    """Test results endpoints"""
    async with httpx.AsyncClient() as client:
        # Get companies first
        response = await client.get(f"{BASE_URL}/api/companies")
        companies = response.json()
        
        if companies:
            company_id = companies[0]["id"]
            response = await client.get(f"{BASE_URL}/api/results/company/{company_id}")
            print(f"Get results for company {company_id}: {response.status_code}")
            results = response.json()
            print(f"Found {len(results)} results")
        
        return True

async def main():
    """Run all tests"""
    print("=== PEEC AI Backend API Tests ===\n")
    
    tests = [
        ("Health Check", test_health),
        ("Companies", test_companies),
        ("Prompts", test_prompts),
        ("Monitoring Status", test_monitoring_status),
        ("Results", test_results),
        ("Prompt Processing", test_prompt_processing),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n--- Testing {test_name} ---")
        try:
            result = await test_func()
            results.append((test_name, result))
            print(f"✓ {test_name}: {'PASSED' if result else 'FAILED'}")
        except Exception as e:
            print(f"✗ {test_name}: ERROR - {e}")
            results.append((test_name, False))
    
    print("\n=== Test Summary ===")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name}: {status}")

if __name__ == "__main__":
    asyncio.run(main()) 