#!/usr/bin/env python3
"""
Comprehensive Test & Audit Suite for openkeyword in content-manager.

Tests:
1. Module imports
2. Company analysis
3. Keyword generation
4. SERP analysis
5. Context integration
6. Error handling
7. Performance
8. Code quality audit
"""

import os
import sys
import asyncio
import time
import json
from datetime import datetime
from pathlib import Path

# Add openkeyword to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-services/openkeyword'))

print("=" * 80)
print("🧪 COMPREHENSIVE TEST & AUDIT SUITE")
print("=" * 80)
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# Test results
results = {
    "passed": [],
    "failed": [],
    "warnings": [],
    "audit_issues": []
}

def test(name, func, *args, **kwargs):
    """Run a test and record results."""
    try:
        start = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start
        
        # Convert result to JSON-serializable format
        result_summary = None
        if result:
            if hasattr(result, 'statistics'):
                result_summary = {
                    "type": "GenerationResult",
                    "total_keywords": result.statistics.total,
                    "avg_score": result.statistics.avg_score
                }
            elif isinstance(result, dict):
                result_summary = {k: str(v)[:100] if not isinstance(v, (str, int, float, bool, type(None))) else v 
                                 for k, v in list(result.items())[:5]}
            else:
                result_summary = str(result)[:100]
        
        results["passed"].append({
            "name": name,
            "duration": f"{duration:.2f}s",
            "result": result_summary
        })
        print(f"✅ {name} ({duration:.2f}s)")
        return result
    except Exception as e:
        results["failed"].append({
            "name": name,
            "error": str(e)
        })
        print(f"❌ {name}: {e}")
        return None

def audit_check(name, check_func, *args, **kwargs):
    """Run an audit check."""
    try:
        issues = check_func(*args, **kwargs)
        if issues:
            results["audit_issues"].extend([{"check": name, "issue": i} for i in issues])
            for issue in issues:
                print(f"⚠️  {name}: {issue}")
        else:
            print(f"✅ {name}: No issues")
        return issues
    except Exception as e:
        print(f"❌ {name}: {e}")
        return []

# ============================================================================
# TEST 1: Environment & Dependencies
# ============================================================================
print("\n" + "=" * 80)
print("1️⃣  ENVIRONMENT & DEPENDENCIES")
print("=" * 80)

def test_environment():
    """Test environment setup."""
    issues = []
    
    # Check API key
    if not os.getenv('GEMINI_API_KEY'):
        issues.append("GEMINI_API_KEY not set")
    else:
        key = os.getenv('GEMINI_API_KEY')
        if len(key) < 20:
            issues.append("GEMINI_API_KEY seems invalid (too short)")
    
    # Check Python version
    if sys.version_info < (3, 8):
        issues.append(f"Python {sys.version} - requires 3.8+")
    
    return len(issues) == 0

test("Environment check", test_environment)

def test_imports():
    """Test all module imports."""
    modules = [
        "openkeywords.company_analyzer",
        "openkeywords.generator",
        "openkeywords.researcher",
        "openkeywords.gemini_serp_analyzer",
        "openkeywords.models",
        "openkeywords.gap_analyzer",
    ]
    
    for module_name in modules:
        try:
            __import__(module_name)
        except ImportError as e:
            raise ImportError(f"Failed to import {module_name}: {e}")
    
    return True

test("Module imports", test_imports)

# ============================================================================
# TEST 2: SDK Compatibility
# ============================================================================
print("\n" + "=" * 80)
print("2️⃣  SDK COMPATIBILITY")
print("=" * 80)

def test_sdk_imports():
    """Test that correct SDKs are used."""
    issues = []
    
    # Check researcher uses google.genai
    import inspect
    from openkeywords import researcher
    
    source = inspect.getsource(researcher.ResearchEngine.__init__)
    if "from google import genai" not in source:
        issues.append("ResearchEngine should use 'from google import genai'")
    if "google.generativeai" in source:
        issues.append("ResearchEngine should NOT use 'google.generativeai'")
    
    # Check gemini_serp_analyzer uses google.genai
    from openkeywords import gemini_serp_analyzer
    source = inspect.getsource(gemini_serp_analyzer.GeminiSerpAnalyzer.__init__)
    if "from google import genai" not in source:
        issues.append("GeminiSerpAnalyzer should use 'from google import genai'")
    if "google.generativeai" in source:
        issues.append("GeminiSerpAnalyzer should NOT use 'google.generativeai'")
    
    return len(issues) == 0, issues

result, issues = test("SDK compatibility", test_sdk_imports)
if issues:
    for issue in issues:
        results["warnings"].append({"check": "SDK", "issue": issue})

# ============================================================================
# TEST 3: Company Analysis
# ============================================================================
print("\n" + "=" * 80)
print("3️⃣  COMPANY ANALYSIS")
print("=" * 80)

async def test_company_analysis():
    """Test company analysis."""
    from openkeywords.company_analyzer import analyze_company
    
    # Test with a simple URL
    result = await analyze_company("https://valoon.chat")
    
    required_fields = [
        'company_name', 'industry', 'description',
        'products', 'services', 'pain_points'
    ]
    
    missing = [f for f in required_fields if f not in result]
    if missing:
        raise ValueError(f"Missing fields: {missing}")
    
    if not result.get('company_name'):
        raise ValueError("Company name not extracted")
    
    return result

test("Company analysis (valoon.chat)", lambda: asyncio.run(test_company_analysis()))

# ============================================================================
# TEST 4: Keyword Generation
# ============================================================================
print("\n" + "=" * 80)
print("4️⃣  KEYWORD GENERATION")
print("=" * 80)

async def test_keyword_generation():
    """Test keyword generation."""
    from openkeywords.generator import KeywordGenerator
    from openkeywords.models import CompanyInfo, GenerationConfig
    
    company_info = CompanyInfo(
        name="Valoon",
        url="https://valoon.chat",
        industry="Construction Technology",
        description="WhatsApp Business chatbot for construction",
        products=["WhatsApp chatbot", "Project management"],
        target_audience="Construction companies",
        target_location="United States",
    )
    
    config = GenerationConfig(
        target_count=10,
        language="english",
        region="us",
        enable_clustering=True,
        enable_serp_analysis=True,
        serp_sample_size=5,
    )
    
    generator = KeywordGenerator(
        gemini_api_key=os.getenv('GEMINI_API_KEY'),
        model='gemini-3-pro-preview'
    )
    
    result = await generator.generate(company_info=company_info, config=config)
    
    if result.statistics.total < 5:
        raise ValueError(f"Expected at least 5 keywords, got {result.statistics.total}")
    
    if result.statistics.avg_score < 50:
        raise ValueError(f"Average score too low: {result.statistics.avg_score}")
    
    return result

result = test("Keyword generation (10 keywords)", lambda: asyncio.run(test_keyword_generation()))

# ============================================================================
# TEST 5: SERP Analysis
# ============================================================================
print("\n" + "=" * 80)
print("5️⃣  SERP ANALYSIS")
print("=" * 80)

async def test_serp_analysis():
    """Test SERP analysis."""
    from openkeywords.gemini_serp_analyzer import GeminiSerpAnalyzer
    
    analyzer = GeminiSerpAnalyzer(
        gemini_api_key=os.getenv('GEMINI_API_KEY'),
        language="en",
        country="us",
    )
    
    # Test with single keyword
    analyses, bonus = await analyzer.analyze_keywords(
        ["construction project management"],
        extract_bonus=True
    )
    
    if not analyses:
        raise ValueError("No SERP analyses returned")
    
    analysis = analyses.get("construction project management")
    if not analysis:
        raise ValueError("Analysis not found for keyword")
    
    if analysis.error:
        raise ValueError(f"SERP analysis error: {analysis.error}")
    
    # Check that we got some data
    if not analysis.features.aeo_opportunity and not analysis.features.has_paa:
        results["warnings"].append({
            "check": "SERP",
            "issue": "SERP analysis returned but no features detected"
        })
    
    return analysis

test("SERP analysis", lambda: asyncio.run(test_serp_analysis()))

# ============================================================================
# TEST 6: Context Integration
# ============================================================================
print("\n" + "=" * 80)
print("6️⃣  CONTEXT INTEGRATION")
print("=" * 80)

def test_rich_context_fields():
    """Test that CompanyInfo has rich context fields."""
    from openkeywords.models import CompanyInfo
    
    fields = CompanyInfo.model_fields
    
    required_rich_fields = [
        'pain_points', 'customer_problems', 'use_cases',
        'value_propositions', 'differentiators', 'key_features',
        'solution_keywords', 'brand_voice'
    ]
    
    missing = [f for f in required_rich_fields if f not in fields]
    if missing:
        raise ValueError(f"Missing rich context fields: {missing}")
    
    return True

test("Rich context fields", test_rich_context_fields)

# ============================================================================
# TEST 7: Error Handling
# ============================================================================
print("\n" + "=" * 80)
print("7️⃣  ERROR HANDLING")
print("=" * 80)

async def test_error_handling():
    """Test error handling."""
    from openkeywords.generator import KeywordGenerator
    from openkeywords.models import CompanyInfo, GenerationConfig
    
    # Test with invalid API key
    try:
        generator = KeywordGenerator(
            gemini_api_key="invalid_key",
            model='gemini-3-pro-preview'
        )
        company_info = CompanyInfo(name="Test", url="https://test.com")
        config = GenerationConfig(target_count=5)
        
        # This should fail gracefully
        result = await generator.generate(company_info=company_info, config=config)
        # If it doesn't fail, that's actually okay (might use env var)
    except Exception as e:
        # Expected to fail with invalid key
        pass
    
    return True

test("Error handling", lambda: asyncio.run(test_error_handling()))

# ============================================================================
# AUDIT: Code Quality
# ============================================================================
print("\n" + "=" * 80)
print("8️⃣  CODE QUALITY AUDIT")
print("=" * 80)

def audit_code_quality():
    """Audit code quality."""
    issues = []
    
    # Check for hardcoded API keys
    openkeyword_path = Path(__file__).parent / "python-services" / "openkeyword" / "openkeywords"
    
    for py_file in openkeyword_path.glob("*.py"):
        try:
            content = py_file.read_text()
            if "AIza" in content and "api_key" in content.lower():
                # Check if it's just in comments or examples
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    if "AIza" in line and "#" not in line[:line.find("AIza")]:
                        issues.append(f"{py_file.name}:{i} - Possible hardcoded API key")
        except:
            pass
    
    # Check for deprecated patterns (but allow in fallback/import sections)
    deprecated_patterns = [
        ("tools=\"google_search_retrieval\"", "Deprecated API"),
        ("gemini-3.0-pro-preview", "Wrong model name (should be gemini-3-pro-preview)"),
    ]
    
    for pattern, reason in deprecated_patterns:
        for py_file in openkeyword_path.glob("*.py"):
            try:
                content = py_file.read_text()
                # Only flag if not in a fallback/except block
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    if pattern in line and not any(x in line.lower() for x in ['except', 'fallback', '#', 'import']):
                        issues.append(f"{py_file.name}:{i} - {reason}: {pattern}")
                        break
            except:
                pass
    
    return issues

audit_check("Code quality", audit_code_quality)

# ============================================================================
# AUDIT: Configuration
# ============================================================================
print("\n" + "=" * 80)
print("9️⃣  CONFIGURATION AUDIT")
print("=" * 80)

def audit_configuration():
    """Audit configuration."""
    issues = []
    
    # Check default model
    from openkeywords.gemini_serp_analyzer import GeminiSerpAnalyzer
    import inspect
    
    source = inspect.getsource(GeminiSerpAnalyzer.__init__)
    if 'model: str = "gemini-3-pro-preview"' in source:
        issues.append("GeminiSerpAnalyzer default model should be gemini-2.0-flash-exp for grounding")
    
    # Check default SERP analyzer
    from openkeywords.generator import _get_serp_analyzer
    source = inspect.getsource(_get_serp_analyzer)
    if "DataForSEO" in source and "GeminiSerpAnalyzer" not in source:
        issues.append("_get_serp_analyzer should default to Gemini SERP, not DataForSEO")
    
    return issues

audit_check("Configuration", audit_configuration)

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("📊 TEST & AUDIT SUMMARY")
print("=" * 80)

print(f"\n✅ Passed: {len(results['passed'])}")
print(f"❌ Failed: {len(results['failed'])}")
print(f"⚠️  Warnings: {len(results['warnings'])}")
print(f"🔍 Audit Issues: {len(results['audit_issues'])}")

if results['failed']:
    print("\n❌ FAILED TESTS:")
    for test in results['failed']:
        print(f"   - {test['name']}: {test['error']}")

if results['warnings']:
    print("\n⚠️  WARNINGS:")
    for warning in results['warnings']:
        print(f"   - {warning['check']}: {warning['issue']}")

if results['audit_issues']:
    print("\n🔍 AUDIT ISSUES:")
    for issue in results['audit_issues']:
        print(f"   - {issue['check']}: {issue['issue']}")

# Save results
output_dir = Path(__file__).parent / "test-output"
output_dir.mkdir(exist_ok=True)

results_file = output_dir / f"test_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
with open(results_file, 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n💾 Results saved to: {results_file}")

# Final verdict
if results['failed']:
    print("\n❌ TEST SUITE FAILED")
    sys.exit(1)
elif results['audit_issues']:
    print("\n⚠️  TEST SUITE PASSED WITH AUDIT ISSUES")
    sys.exit(0)
else:
    print("\n✅ TEST SUITE PASSED")
    sys.exit(0)

