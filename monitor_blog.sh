#!/bin/bash
echo "🔍 BLOG GENERATION MONITOR"
echo "=========================="
echo ""

# Check if process is running
if ps -p 14871 > /dev/null 2>&1; then
    elapsed=$(ps -p 14871 -o etime= | tr -d ' ')
    echo "⏳ Process 14871 is RUNNING (elapsed: $elapsed)"
    echo ""
    echo "📊 Process details:"
    ps -p 14871 -o pid,etime,%cpu,%mem,command
    echo ""
    echo "💡 Expected completion: 5-10 minutes total"
    echo "🔄 Check again in 1-2 minutes"
else
    echo "✅ Process 14871 has COMPLETED or TERMINATED"
    echo ""
    echo "📁 Checking for output..."
    if [ -f "test_full_blog_production_output.json" ]; then
        echo "✅ Output file found!"
        echo ""
        python3 -c "
import json
with open('test_full_blog_production_output.json') as f:
    data = json.load(f)
    print(f\"📝 Headline: {data.get('headline', 'N/A')}\")
    print(f\"📏 HTML Length: {len(data.get('html_content', '')):,} chars\")
    print(f\"📊 Word Count: {data.get('word_count', 0):,}\")
    print(f\"⏱️  Duration: {data.get('duration_seconds', 0):.1f}s\")
        "
    else
        echo "⚠️  No output file found yet"
    fi
fi
