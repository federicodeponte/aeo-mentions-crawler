#!/bin/bash
#
# Final blog generation test
#

cd "$(dirname "$0")"

export GEMINI_API_KEY="***REMOVED***"

echo "============================================================"
echo "FINAL BLOG GENERATION TEST"
echo "============================================================"
echo ""
echo "⏱️  Start: $(date '+%H:%M:%S')"
echo ""

cat <<'EOF' | python3 scripts/generate-blog.py > test_blog_final_output.json 2> test_blog_final_stderr.log
{
  "primary_keyword": "Answer Engine Optimization for B2B companies",
  "word_count": 800,
  "tone": "professional",
  "company_name": "SCAILE Technologies",
  "company_url": "https://scaile.tech",
  "language": "en",
  "country": "US"
}
EOF

EXIT_CODE=$?

echo "⏱️  End: $(date '+%H:%M:%S')"
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ SUCCESS!"
    echo ""
    echo "📊 Result:"
    python3 -c "
import json
with open('test_blog_final_output.json') as f:
    result = json.load(f)
    if result.get('success'):
        print(f\"  Headline: {result.get('headline', 'N/A')[:60]}...\")
        print(f\"  Words: {result.get('word_count', 0)}\")
        print(f\"  AEO Score: {result.get('aeo_score', 'N/A')}\")
        print(f\"  Duration: {result.get('duration_seconds', 0):.1f}s\")
        print(f\"\\n🔍 Enhanced Data:\")
        print(f\"  Citations: {result.get('citations_count', 0)}\")
        print(f\"  Internal Links: {result.get('internal_links_count', 0)}\")
        print(f\"  FAQ: {result.get('faq_count', 0)}\")
        print(f\"  PAA: {result.get('paa_count', 0)}\")
        print(f\"  Meta Title: {'✅' if result.get('meta_title') else '❌'}\")
        print(f\"  Image: {'✅' if result.get('image_url') else '❌'}\")
        print(f\"\\n💾 Full output: test_blog_final_output.json\")
        print(f\"📄 Stderr log: test_blog_final_stderr.log\")
    else:
        print(f\"❌ Error: {result.get('error')}\")
"
else
    echo "❌ FAILED (exit code: $EXIT_CODE)"
    echo ""
    echo "Output:"
    cat test_blog_final_output.json 2>/dev/null || echo "(no output file)"
fi

echo ""
echo "============================================================"

