#!/bin/bash
echo "Testing streaming keyword generation..."
echo ""

# Test data
cat > /tmp/test_input.json << 'TESTDATA'
{
  "company_name": "Test Company",
  "company_url": "https://example.com",
  "description": "Project management software",
  "industry": "SaaS",
  "products": ["Project Management"],
  "target_count": 5,
  "enable_research": false,
  "enable_serp_analysis": false,
  "min_word_count": 3
}
TESTDATA

echo "Input data:"
cat /tmp/test_input.json
echo ""
echo "----------------------------------------"
echo "Running Python script..."
echo "----------------------------------------"

# Load API key from .env.local
export GEMINI_API_KEY=$(grep "^GEMINI_API_KEY=" .env.local | cut -d'=' -f2)

# Run the streaming script
python3 scripts/generate-keywords-streaming.py < /tmp/test_input.json 2>&1 | head -50
