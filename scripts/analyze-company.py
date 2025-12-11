#!/usr/bin/env python3
import sys
import json
import os
import asyncio
import requests

# Add the services directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services', 'aeo-checks'))

from gemini_client import GeminiCompanyAnalysisClient

async def analyze_company(company_name: str, company_website: str) -> dict:
    """
    Run comprehensive company analysis to get products, services, and business info.
    This provides the data needed for meaningful AEO mentions checks.
    """
    try:
        # Use Modal company analysis service if available, otherwise use local Gemini
        modal_endpoint = os.getenv('MODAL_COMPANY_ANALYSIS_ENDPOINT')
        
        if modal_endpoint:
            print(f"[COMPANY_ANALYSIS:Modal] Calling Modal service: {modal_endpoint}", file=sys.stderr)
            
            response = requests.post(
                f"{modal_endpoint}/analyze",
                json={
                    "company_name": company_name,
                    "company_website": company_website,
                    "include_logo": True,
                    "include_tech_stack": True
                },
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"[COMPANY_ANALYSIS:Modal] ✅ Analysis complete for {company_name}", file=sys.stderr)
                return result
            else:
                print(f"[COMPANY_ANALYSIS:Modal] ❌ Failed: {response.status_code} {response.text}", file=sys.stderr)
                
        # Fallback to native Gemini analysis
        print(f"[COMPANY_ANALYSIS:Gemini] Running native Gemini analysis for {company_name}", file=sys.stderr)
        
        client = GeminiCompanyAnalysisClient()
        
        prompt = f"""Analyze the company "{company_name}" with website "{company_website}".

Provide comprehensive business analysis including:

1. **Products & Services**: List all main products and services offered
2. **Industry & Market**: Primary industry, target market, business model
3. **Value Proposition**: Core value proposition and differentiators  
4. **Target Customers**: Ideal customer profile and segments
5. **Competitors**: Main competitors and market positioning
6. **Technology**: Key technologies or platforms used
7. **Business Model**: Revenue model, pricing approach
8. **Company Info**: Founded date, size, location, key facts

Return detailed JSON with this exact structure:
{{
  "company_info": {{
    "name": "{company_name}",
    "website": "{company_website}",
    "industry": "specific industry",
    "description": "detailed company description",
    "founded": "year or unknown",
    "size": "startup/small/medium/large",
    "location": "headquarters location"
  }},
  "products": [
    {{"name": "product name", "description": "what it does", "category": "type"}},
  ],
  "services": [
    {{"name": "service name", "description": "what it provides", "category": "type"}},
  ],
  "target_customers": {{
    "segments": ["customer type 1", "customer type 2"],
    "industries": ["target industry 1", "target industry 2"], 
    "company_sizes": ["startup", "enterprise", "etc"]
  }},
  "value_proposition": "core value and differentiators",
  "competitors": ["competitor 1", "competitor 2", "competitor 3"],
  "technology_stack": ["tech 1", "tech 2", "tech 3"],
  "business_model": "how they make money",
  "insights": "key strategic insights about market position"
}}

Focus on extracting REAL, specific information about their actual products and services - this is critical for AEO analysis."""

        # Use native Gemini SDK
        response = client.client.models.generate_content(
            model="gemini-3-pro-preview",
            contents=prompt,
            config={
                "temperature": 0.2,
                "response_mime_type": "application/json",
            }
        )
        
        # Extract response text from native Gemini SDK
        if hasattr(response, 'text') and response.text:
            content = response.text
        elif hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                if hasattr(candidate.content, 'parts') and candidate.content.parts:
                    content = ''.join(part.text for part in candidate.content.parts if hasattr(part, 'text') and part.text)
                else:
                    content = str(candidate.content)
            else:
                content = str(candidate)
        else:
            content = str(response)
        
        if not content:
            raise ValueError("Empty response from Gemini")
            
        # Extract JSON from response  
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            analysis_data = json.loads(json_match.group())
            
            # Validate that we have products or services
            products = analysis_data.get('products', [])
            services = analysis_data.get('services', [])
            
            if not products and not services:
                raise ValueError("No products or services found in analysis")
            
            print(f"[COMPANY_ANALYSIS:Gemini] ✅ Found {len(products)} products, {len(services)} services", file=sys.stderr)
            
            return {
                "success": True,
                "data": analysis_data,
                "source": "native_gemini",
                "has_products_or_services": True,
                "validation": {
                    "products": len(products),
                    "services": len(services),
                    "industry": analysis_data.get('company_info', {}).get('industry', 'missing'),
                    "description_length": len(analysis_data.get('company_info', {}).get('description', ''))
                }
            }
        else:
            raise ValueError(f"Could not extract JSON from response: {content[:200]}...")
            
    except Exception as e:
        print(f"[COMPANY_ANALYSIS] ❌ Error: {str(e)}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e),
            "data": None,
            "source": "error",
            "has_products_or_services": False
        }

async def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        company_name = input_data.get('company_name')
        company_website = input_data.get('company_website')
        
        if not company_name or not company_website:
            print(json.dumps({
                "success": False,
                "error": "Missing required fields: company_name, company_website"
            }))
            return
            
        print(f"[COMPANY_ANALYSIS] Starting analysis for {company_name} ({company_website})", file=sys.stderr)
        
        # Run the company analysis
        result = await analyze_company(company_name, company_website)
        
        # Output the result to stdout only (for API parsing)
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Script error: {str(e)}"
        }))

if __name__ == "__main__":
    asyncio.run(main())