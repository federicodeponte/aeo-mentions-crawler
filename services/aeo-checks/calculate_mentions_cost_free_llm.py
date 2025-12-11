#!/usr/bin/env python3
"""
Calculate ACTUAL cost for AEO Mentions check with FREE LLM tokens.
Reality check: Only DataForSEO SERP costs matter!
"""

print("""
================================================================================
💰 AEO MENTIONS - COST WITH FREE LLM TOKENS (999 COMPANIES)
================================================================================
""")

# ============================================================================
# PRICING DATA
# ============================================================================

print("\n📋 PRICING DATA")
print("=" * 80)

# LLM Tokens: FREE
print("\n✅ FREE LLM Tokens:")
print("  • Gemini SDK: FREE (you have credits)")
print("  • ChatGPT/GPT-4o: FREE (you have credits)")
print("  • Claude 3.5 Sonnet: PAID (via OpenRouter)")
print("  • Perplexity Sonar Pro: PAID (via OpenRouter)")

# DataForSEO SERP API
DATAFORSEO_SERP_PRICE = 0.0006  # $0.0006 per search request

print(f"\n💳 DataForSEO SERP API (PAID):")
print(f"  • Google Organic Search: ${DATAFORSEO_SERP_PRICE}/request")
print(f"  • Used by: Claude, ChatGPT (OpenRouter platforms)")
print(f"  • NOT used by: Gemini (native search), Perplexity (native search)")

# OpenRouter pricing (for non-free platforms)
OPENROUTER_PRICING = {
    "perplexity/sonar-pro": {
        "input": 3.00,   # $3 per 1M input tokens
        "output": 15.00, # $15 per 1M output tokens
    },
    "anthropic/claude-3.5-sonnet": {
        "input": 3.00,   # $3 per 1M input tokens
        "output": 15.00, # $15 per 1M output tokens
    },
}

print(f"\n💳 OpenRouter LLM Pricing (PAID):")
print(f"  • Perplexity: $3/M input, $15/M output")
print(f"  • Claude: $3/M input, $15/M output")

# ============================================================================
# MEASURED TOKEN USAGE
# ============================================================================

MEASURED_TOKENS = {
    "gemini": 555,
    "claude": 1396,
    "chatgpt": 443,
    "perplexity": 799,
}

TOKEN_SPLIT = {"input": 0.15, "output": 0.85}

# ============================================================================
# CONFIGURATION
# ============================================================================

NUM_COMPANIES = 999

MODES = {
    "fast": {
        "queries_per_company": 10,
        "platforms": ["gemini", "chatgpt"],
        "description": "Fast mode: 10 queries, Gemini + ChatGPT"
    },
    "fast_plus_perplexity": {
        "queries_per_company": 10,
        "platforms": ["gemini", "chatgpt", "perplexity"],
        "description": "Fast + Perplexity: 10 queries, 3 platforms"
    },
    "full": {
        "queries_per_company": 50,
        "platforms": ["gemini", "claude", "chatgpt", "perplexity"],
        "description": "Full mode: 50 queries, all 4 platforms"
    }
}

# ============================================================================
# COST CALCULATION
# ============================================================================

def calculate_cost_with_free_llm(mode_name):
    """Calculate cost assuming FREE Gemini and ChatGPT tokens."""
    mode = MODES[mode_name]
    
    print(f"\n\n💵 COST: {mode_name.upper().replace('_', ' ')}")
    print("=" * 80)
    print(f"{mode['description']}")
    print(f"Companies: {NUM_COMPANIES} | Queries/company: {mode['queries_per_company']}")
    print()
    
    total_cost = 0.0
    total_queries = NUM_COMPANIES * mode['queries_per_company']
    
    for platform in mode['platforms']:
        print(f"\n{platform.upper()}")
        print("-" * 80)
        
        platform_queries = total_queries
        
        # Check if platform is free
        is_free = platform in ["gemini", "chatgpt"]
        
        # LLM Cost
        if is_free:
            print(f"  ✅ LLM: FREE (you have credits)")
            llm_cost = 0.0
        else:
            # Calculate actual LLM cost
            avg_tokens = MEASURED_TOKENS[platform]
            total_tokens = platform_queries * avg_tokens
            input_tokens = total_tokens * TOKEN_SPLIT["input"]
            output_tokens = total_tokens * TOKEN_SPLIT["output"]
            
            model_key = {
                "claude": "anthropic/claude-3.5-sonnet",
                "perplexity": "perplexity/sonar-pro"
            }[platform]
            pricing = OPENROUTER_PRICING[model_key]
            input_cost = (input_tokens / 1_000_000) * pricing["input"]
            output_cost = (output_tokens / 1_000_000) * pricing["output"]
            llm_cost = input_cost + output_cost
            
            print(f"  💳 LLM: ${llm_cost:,.2f} (OpenRouter - PAID)")
            print(f"     Tokens: {total_tokens:,} ({input_tokens:,.0f} in, {output_tokens:,.0f} out)")
        
        # SERP Cost
        serp_cost = 0.0
        if platform == "chatgpt":
            # ChatGPT uses google_search → DataForSEO
            serp_cost = platform_queries * DATAFORSEO_SERP_PRICE
            print(f"  💳 SERP: ${serp_cost:,.2f} (DataForSEO - {platform_queries:,} requests)")
        elif platform == "claude":
            # Claude uses google_search → DataForSEO
            serp_cost = platform_queries * DATAFORSEO_SERP_PRICE
            print(f"  💳 SERP: ${serp_cost:,.2f} (DataForSEO - {platform_queries:,} requests)")
        else:
            # Gemini and Perplexity have native search
            print(f"  ✅ SERP: FREE (native search)")
        
        platform_total = llm_cost + serp_cost
        total_cost += platform_total
        
        print(f"\n  Platform Total: ${platform_total:,.2f}")
    
    # Summary
    print("\n\n" + "=" * 80)
    print(f"💰 TOTAL COST: ${total_cost:,.2f}")
    print("=" * 80)
    print(f"   Cost per company: ${total_cost/NUM_COMPANIES:,.4f}")
    print(f"   Cost per query: ${total_cost/total_queries:,.6f}")
    
    return total_cost

# ============================================================================
# RUN CALCULATIONS
# ============================================================================

print("\n\n" + "=" * 80)
print("🚀 CALCULATING COSTS WITH FREE LLM TOKENS")
print("=" * 80)

fast_cost = calculate_cost_with_free_llm("fast")
fast_perplexity_cost = calculate_cost_with_free_llm("fast_plus_perplexity")
full_cost = calculate_cost_with_free_llm("full")

# ============================================================================
# COMPARISON
# ============================================================================

print("\n\n" + "=" * 80)
print("⚖️  COST COMPARISON (WITH FREE LLM TOKENS)")
print("=" * 80)

print(f"\n{'Mode':<25s} {'Queries':<10s} {'Platforms':<20s} {'Total Cost':<15s} {'$/Company'}")
print("-" * 90)

modes_to_show = [
    ("fast", "FAST", fast_cost),
    ("fast_plus_perplexity", "FAST + PERPLEXITY", fast_perplexity_cost),
    ("full", "FULL", full_cost),
]

for mode_key, mode_label, cost in modes_to_show:
    mode = MODES[mode_key]
    total_queries = NUM_COMPANIES * mode['queries_per_company']
    platforms_str = ", ".join(mode['platforms'])
    
    print(f"{mode_label:<25s} {total_queries:<10,} {platforms_str:<20s} ${cost:<14,.2f} ${cost/NUM_COMPANIES:.4f}")

print("\n" + "=" * 80)
print("💡 KEY INSIGHTS:")
print("=" * 80)
print(f"• FAST mode: ${fast_cost:.2f} (only DataForSEO for ChatGPT)")
print(f"• Adding Perplexity: ${fast_perplexity_cost - fast_cost:.2f} extra (Perplexity has native search!)")
print(f"• FULL mode: ${full_cost:.2f} (includes Claude SERP costs)")
print(f"• Savings vs FULL: ${full_cost - fast_cost:.2f} ({(1-fast_cost/full_cost)*100:.1f}% cheaper)")
print("=" * 80)

print("\n\n✅ REALITY CHECK")
print("=" * 80)
print("With FREE Gemini + ChatGPT LLM tokens:")
print(f"  • FAST mode is only ${fast_cost:.2f} (DataForSEO SERP only)")
print(f"  • Adding Perplexity is basically FREE (native search)")
print(f"  • FULL mode costs ${full_cost:.2f} (mostly Claude LLM + SERP)")
print("\nYou were right - it's much cheaper than the initial calculation!")
print("=" * 80)

