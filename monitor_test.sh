#!/bin/bash
# Monitor the full test in real-time

echo "=" >> "="
echo "🔍 MONITORING FULL TEST"
echo "="
echo ""

while true; do
    if ps -p 42233 > /dev/null 2>&1; then
        ELAPSED=$(ps -p 42233 -o etime= | tr -d ' ')
        echo -ne "\r⏱️  Running: $ELAPSED | Stage: "
        
        # Get current stage from log
        if [ -f test_full_no_timeout.log ]; then
            STAGE=$(grep "Executing Stage" test_full_no_timeout.log | tail -1 | sed 's/.*Executing //' | sed 's/INFO.*//')
            echo -ne "$STAGE"
        else
            echo -ne "Starting..."
        fi
        
        sleep 5
    else
        echo -e "\n\n✅ Process completed!"
        
        if [ -f test_full_no_timeout_output.json ]; then
            echo ""
            echo "📊 Results:"
            python3 -c "
import json
with open('test_full_no_timeout_output.json') as f:
    data = json.load(f)
    print(f\"   Headline: {data.get('headline', 'N/A')[:60]}...\")
    print(f\"   Words: {data.get('word_count', 0)}\")
    print(f\"   Citations: {data.get('citations_count', 0)}\")
    print(f\"   FAQ: {data.get('faq_count', 0)}\")
    print(f\"   Duration: {data.get('duration_seconds', 'N/A')}s\")
"
        else
            echo ""
            echo "❌ No output file - check logs"
        fi
        
        break
    fi
done

