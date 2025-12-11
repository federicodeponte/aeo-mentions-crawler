#!/usr/bin/env python3
"""
Quick test of updated company analysis with all fields
"""
import requests
import json

def test_single_company():
    """Test company analysis with one company to verify all fields are extracted."""
    
    print("\n🧪 Testing Enhanced Company Analysis")
    print("="*80)
    
    # Start local server first (manual step)
    url = "http://localhost:8000/company/analyze"
    payload = {
        "website_url": "https://8fit.com",
        "company_name": "8fit",
        "extract_logo": False,  # Skip logo to speed up test
        "mode": "fast"
    }
    
    print(f"📤 Request: {payload['company_name']} - {payload['website_url']}")
    print(f"   Mode: {payload['mode']}")
    print(f"   Extract logo: {payload['extract_logo']}\n")
    
    try:
        response = requests.post(url, json=payload, timeout=300)
        
        if response.status_code == 200:
            result = response.json()
            company_info = result.get('company_info', {})
            
            print("✅ Analysis complete!\n")
            print("📋 CHECKING FIELD EXTRACTION:")
            print("-" * 80)
            
            # Check all the fields we care about
            fields_to_check = [
                ('description', 'Description'),
                ('industry', 'Industry'),
                ('products', 'Products'),
                ('services', 'Services'),
                ('pain_points', 'Pain Points'),
                ('customer_problems', 'Customer Problems'),
                ('solution_keywords', 'Solution Keywords'),
                ('value_propositions', 'Value Propositions'),
                ('differentiators', 'Differentiators'),
                ('use_cases', 'Use Cases'),
                ('target_audience', 'Target Audience'),
                ('key_features', 'Key Features'),
            ]
            
            missing_count = 0
            for field_key, field_name in fields_to_check:
                value = company_info.get(field_key)
                
                if value is None:
                    status = "❌ MISSING"
                    missing_count += 1
                elif isinstance(value, list) and len(value) == 0:
                    status = "⚠️  EMPTY"
                    missing_count += 1
                elif isinstance(value, str) and len(value) == 0:
                    status = "⚠️  EMPTY"
                    missing_count += 1
                else:
                    if isinstance(value, list):
                        status = f"✅ {len(value)} items"
                    else:
                        status = f"✅ {len(str(value))} chars"
                
                print(f"  {field_name:25s} {status}")
                
                # Show first item/preview
                if value and status.startswith("✅"):
                    if isinstance(value, list) and len(value) > 0:
                        print(f"    └─ {value[0][:60]}...")
                    elif isinstance(value, str):
                        print(f"    └─ {value[:60]}...")
            
            print("-" * 80)
            
            # Check top-level fields
            print("\n📋 TOP-LEVEL FIELDS:")
            print(f"  brand_voice: {'✅ ' + result.get('brand_voice', 'N/A')[:50] if result.get('brand_voice') else '❌ MISSING'}")
            print(f"  tone: {'✅ ' + result.get('tone', 'N/A')[:50] if result.get('tone') else '❌ MISSING'}")
            
            if result.get('brand_voice'):
                missing_count -= 1
            if result.get('tone'):
                missing_count -= 1
            
            print("\n" + "=" * 80)
            if missing_count == 0:
                print("🎉 SUCCESS! All fields extracted properly")
            else:
                print(f"⚠️  {missing_count} fields missing or empty")
            print("=" * 80)
            
            # Save result
            with open("test_enhanced_analysis.json", "w") as f:
                json.dump(result, f, indent=2)
            print("\n💾 Full result saved to: test_enhanced_analysis.json")
            
        else:
            print(f"❌ Request failed: {response.status_code}")
            print(response.text[:500])
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_single_company()

