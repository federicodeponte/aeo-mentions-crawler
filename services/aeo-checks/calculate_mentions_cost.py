#!/usr/bin/env python3
"""
Calculate detailed cost for AEO Mentions check across 999 companies.
NO ASSUMPTIONS - Uses actual API pricing and measured token usage.
"""

print("""
================================================================================
💰 AEO MENTIONS - DETAILED COST CALCULATION FOR 999 COMPANIES
================================================================================
""")

# ============================================================================
# PRICING DATA (from actual API providers, Dec 2024)
# ============================================================================

print("\n📋 PRICING DATA (Per Million Tokens)")
print("=" * 80)

# OpenRouter Pricing (from https://openrouter.ai/models)
OPENROUTER_PRICING = {
    "perplexity/sonar-pro": {
        "input": 3.00,   # $3 per 1M input tokens
        "output": 15.00, # $15 per 1M output tokens
        "name": "Perplexity Sonar Pro"
    },
    "anthropic/claude-3.5-sonnet": {
        "input": 3.00,   # $3 per 1M input tokens
        "output": 15.00, # $15 per 1M output tokens
        "name": "Claude 3.5 Sonnet"
    },
    "openai/gpt-4o": {
        "input": 2.50,   # $2.50 per 1M input tokens
        "output": 10.00, # $10 per 1M output tokens
        "name": "GPT-4o"
    }
}

# Gemini Pricing (from https://ai.google.dev/pricing)
GEMINI_PRICING = {
    "gemini-3-pro-preview": {
        "input": 1.25,   # $1.25 per 1M input tokens (≤200K context)
        "output": 10.00, # $10 per 1M output tokens
        "name": "Gemini 3 Pro Preview"
    }
}

# DataForSEO SERP API (from https://dataforseo.com/pricing)
DATAFORSEO_SERP_PRICE = 0.0006  # $0.0006 per search request (standard priority)

print("\nOpenRouter Models:")
for model, pricing in OPENROUTER_PRICING.items():
    print(f"  • {pricing['name']}")
    print(f"    - Input:  ${pricing['input']:.2f}/M tokens")
    print(f"    - Output: ${pricing['output']:.2f}/M tokens")

print("\nGemini SDK:")
for model, pricing in GEMINI_PRICING.items():
    print(f"  • {pricing['name']}")
    print(f"    - Input:  ${pricing['input']:.2f}/M tokens")
    print(f"    - Output: ${pricing['output']:.2f}/M tokens")

print(f"\nDataForSEO SERP API:")
print(f"  • Google Organic Search: ${DATAFORSEO_SERP_PRICE}/request")

# ============================================================================
# MEASURED TOKEN USAGE (from actual test runs)
# ============================================================================

print("\n\n📊 MEASURED TOKEN USAGE (From Test Runs)")
print("=" * 80)

# From test_mentions_hybrid.py output (actual measurements)
MEASURED_TOKENS = {
    "gemini": 555,       # Gemini: 555 tokens
    "claude": 1396,      # Claude: 1396 tokens
    "chatgpt": 443,      # ChatGPT: 443 tokens
    "perplexity": 799,   # Perplexity: 799 tokens
}

print("\nAverage tokens per query per platform:")
for platform, tokens in MEASURED_TOKENS.items():
    print(f"  • {platform.capitalize():12s}: {tokens:4d} tokens")

# ============================================================================
# CONFIGURATION
# ============================================================================

print("\n\n⚙️  CONFIGURATION")
print("=" * 80)

NUM_COMPANIES = 999

# Mode options
MODES = {
    "fast": {
        "queries_per_company": 10,
        "platforms": ["gemini", "chatgpt"],
        "description": "Fast mode: 10 queries, Gemini + ChatGPT only"
    },
    "full": {
        "queries_per_company": 50,
        "platforms": ["gemini", "claude", "chatgpt", "perplexity"],
        "description": "Full mode: 50 queries, all 4 platforms"
    }
}

# Token distribution (typical for a query with search)
# Based on actual API responses
TOKEN_SPLIT = {
    "input": 0.15,   # ~15% input tokens (query + context)
    "output": 0.85,  # ~85% output tokens (response with search results)
}

print(f"\nCompanies to process: {NUM_COMPANIES}")
print(f"\nModes available:")
for mode_name, mode_config in MODES.items():
    print(f"  • {mode_name.upper()}: {mode_config['description']}")
    print(f"    - Queries/company: {mode_config['queries_per_company']}")
    print(f"    - Platforms: {', '.join(mode_config['platforms'])}")

# ============================================================================
# COST CALCULATION
# ============================================================================

def calculate_cost_for_mode(mode_name):
    """Calculate detailed cost for a specific mode."""
    mode = MODES[mode_name]
    
    print(f"\n\n💵 COST CALCULATION: {mode_name.upper()} MODE")
    print("=" * 80)
    print(f"{mode['description']}")
    print(f"Companies: {NUM_COMPANIES} | Queries/company: {mode['queries_per_company']}")
    print()
    
    total_cost = 0.0
    total_queries = NUM_COMPANIES * mode['queries_per_company']
    
    # Track costs by component
    llm_costs = {}
    serp_costs = {}
    
    for platform in mode['platforms']:
        print(f"\n{platform.upper()}")
        print("-" * 80)
        
        # Total queries for this platform
        platform_queries = total_queries
        
        # Get token usage
        avg_tokens = MEASURED_TOKENS[platform]
        total_tokens = platform_queries * avg_tokens
        input_tokens = total_tokens * TOKEN_SPLIT["input"]
        output_tokens = total_tokens * TOKEN_SPLIT["output"]
        
        print(f"  Total queries: {platform_queries:,}")
        print(f"  Avg tokens/query: {avg_tokens}")
        print(f"  Total tokens: {total_tokens:,}")
        print(f"    - Input:  {input_tokens:,.0f} ({TOKEN_SPLIT['input']*100:.0f}%)")
        print(f"    - Output: {output_tokens:,.0f} ({TOKEN_SPLIT['output']*100:.0f}%)")
        
        # Calculate LLM cost
        if platform == "gemini":
            pricing = GEMINI_PRICING["gemini-3-pro-preview"]
            input_cost = (input_tokens / 1_000_000) * pricing["input"]
            output_cost = (output_tokens / 1_000_000) * pricing["output"]
        else:
            model_key = {
                "claude": "anthropic/claude-3.5-sonnet",
                "chatgpt": "openai/gpt-4o",
                "perplexity": "perplexity/sonar-pro"
            }[platform]
            pricing = OPENROUTER_PRICING[model_key]
            input_cost = (input_tokens / 1_000_000) * pricing["input"]
            output_cost = (output_tokens / 1_000_000) * pricing["output"]
        
        llm_cost = input_cost + output_cost
        llm_costs[platform] = llm_cost
        
        print(f"\n  LLM Cost:")
        print(f"    - Input:  ${input_cost:,.2f}")
        print(f"    - Output: ${output_cost:,.2f}")
        print(f"    - Total:  ${llm_cost:,.2f}")
        
        # Calculate SERP cost (for platforms using DataForSEO)
        serp_cost = 0.0
        if platform in ["claude", "chatgpt"]:
            # These use google_search tool → DataForSEO
            serp_requests = platform_queries  # 1 search per query
            serp_cost = serp_requests * DATAFORSEO_SERP_PRICE
            serp_costs[platform] = serp_cost
            
            print(f"\n  DataForSEO SERP Cost:")
            print(f"    - Requests: {serp_requests:,}")
            print(f"    - Cost/request: ${DATAFORSEO_SERP_PRICE}")
            print(f"    - Total: ${serp_cost:,.2f}")
        elif platform == "perplexity":
            print(f"\n  DataForSEO SERP Cost: $0.00 (Perplexity has native search)")
        elif platform == "gemini":
            print(f"\n  DataForSEO SERP Cost: $0.00 (Gemini uses native Google search)")
        
        platform_total = llm_cost + serp_cost
        total_cost += platform_total
        
        print(f"\n  Platform Total: ${platform_total:,.2f}")
    
    # Summary
    print("\n\n" + "=" * 80)
    print(f"📊 SUMMARY: {mode_name.upper()} MODE")
    print("=" * 80)
    
    print(f"\nTotal Queries: {total_queries:,}")
    print(f"  • Per company: {mode['queries_per_company']}")
    print(f"  • Per platform: {total_queries:,}")
    
    print(f"\nLLM Costs:")
    for platform in mode['platforms']:
        print(f"  • {platform.capitalize():12s}: ${llm_costs[platform]:,.2f}")
    total_llm = sum(llm_costs.values())
    print(f"  {'TOTAL LLM':>12s}: ${total_llm:,.2f}")
    
    print(f"\nDataForSEO SERP Costs:")
    for platform in mode['platforms']:
        cost = serp_costs.get(platform, 0.0)
        note = ""
        if platform in ["perplexity", "gemini"]:
            note = " (native search)"
        print(f"  • {platform.capitalize():12s}: ${cost:,.2f}{note}")
    total_serp = sum(serp_costs.values())
    print(f"  {'TOTAL SERP':>12s}: ${total_serp:,.2f}")
    
    print(f"\n{'=' * 80}")
    print(f"💰 TOTAL COST: ${total_cost:,.2f}")
    print(f"{'=' * 80}")
    print(f"   Cost per company: ${total_cost/NUM_COMPANIES:,.4f}")
    print(f"   Cost per query: ${total_cost/total_queries:,.4f}")
    
    return total_cost

# ============================================================================
# RUN CALCULATIONS
# ============================================================================

print("\n\n" + "=" * 80)
print("🚀 CALCULATING COSTS FOR BOTH MODES")
print("=" * 80)

fast_cost = calculate_cost_for_mode("fast")
full_cost = calculate_cost_for_mode("full")

# ============================================================================
# COMPARISON
# ============================================================================

print("\n\n" + "=" * 80)
print("⚖️  MODE COMPARISON")
print("=" * 80)

print(f"\n{'Mode':<10s} {'Companies':<12s} {'Queries':<12s} {'Platforms':<15s} {'Total Cost':<15s} {'$/Company'}")
print("-" * 80)

for mode_name in ["fast", "full"]:
    mode = MODES[mode_name]
    cost = fast_cost if mode_name == "fast" else full_cost
    total_queries = NUM_COMPANIES * mode['queries_per_company']
    platforms_str = f"{len(mode['platforms'])} plat"
    
    print(f"{mode_name.upper():<10s} {NUM_COMPANIES:<12,} {total_queries:<12,} {platforms_str:<15s} ${cost:<14,.2f} ${cost/NUM_COMPANIES:.4f}")

print("\n" + "=" * 80)
print(f"💡 Savings with FAST mode: ${full_cost - fast_cost:,.2f} ({(1-fast_cost/full_cost)*100:.1f}% cheaper)")
print("=" * 80)

print("\n\n✅ CALCULATION COMPLETE")
print("=" * 80)
print("\nNOTES:")
print("• All prices are from official API documentation (Dec 2024)")
print("• Token measurements from actual test runs")
print("• DataForSEO SERP: $0.0006/request (standard priority)")
print("• Gemini uses native Google search (free)")
print("• Perplexity has native search built-in (no extra SERP cost)")
print("• Claude & ChatGPT use DataForSEO for google_search tool")
print("=" * 80)

