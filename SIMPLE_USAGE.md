# AI Visibility Monitor Simple Usage (No Server Required)

## Quick Start

### 1. Setup Environment
```bash
# Make sure you're in the project directory
cd /Users/federicodeponte/Downloads/peec-ai-copy

# Activate virtual environment
source venv310/bin/activate

# Make sure your .env file has the working API keys
# PERPLEXITY_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here
# SERPER_API_KEY=your_key_here (optional)
```

### 2. Choose Your Approach

## Option A: Interactive Simple Monitor
```bash
python simple_monitor.py
```

**What it does:**
- Interactive menu for testing prompts
- Quick test mode (3 standard prompts)
- Custom prompt testing
- Single prompt across multiple models

**Best for:** Quick testing and experimentation

## Option B: Batch Monitor
```bash
python batch_monitor.py
```

**What it does:**
- Runs predefined companies and prompts
- Saves results to JSON files
- Generates summary reports
- No interaction required

**Best for:** Regular monitoring runs

## Option C: Original Standalone Monitor
```bash
python standalone_monitor.py
```

**What it does:**
- Full-featured monitoring
- Multiple companies and prompts
- Detailed results saving

**Best for:** Comprehensive monitoring

## Daily Automation (No Server)

### Option 1: macOS Cron Job
```bash
# Edit crontab
crontab -e

# Add this line for daily 9 AM monitoring:
0 9 * * * cd /Users/federicodeponte/Downloads/peec-ai-copy && source venv310/bin/activate && python batch_monitor.py
```

### Option 2: Manual Daily Run
```bash
# Just run this command daily
python batch_monitor.py
```

## What You Get

### Immediate Results
- **Console output** showing real-time progress
- **Mention counts** for each company across models
- **Link extraction** from AI responses
- **Error handling** for failed requests

### Saved Files
- **JSON results** with full data
- **Summary reports** in text format
- **Timestamped files** for tracking

### Example Output
```
🔍 Monitoring Scaile
==================================================

📋 Prompt 1/3: How does Scaile appear in AI search results compared to thei...
   🤖 Testing PERPLEXITY...
      ✅ 5 mentions, 0 links
   🤖 Testing GEMINI...
      ✅ 12 mentions, 0 links

✅ Batch monitoring complete!
📊 Monitored 2 companies
💾 Combined results saved to: batch_all_companies_20250712.json
```

## Costs

### Per Run (2 companies, 6 prompts total)
- **Perplexity API**: ~$0.10-0.20
- **Gemini API**: ~$0.05-0.10
- **Serper Search**: ~$0.02-0.05
- **Total per run**: ~$0.17-0.35

### Monthly (daily runs)
- **~$5-10/month** for regular monitoring
- Much cheaper than server hosting!

## Customization

### Add Your Companies
Edit `batch_monitor.py`:
```python
companies = {
    "Your Company": [
        "How does Your Company appear in AI search results?",
        "What are the latest mentions of Your Company?",
        "How is Your Company positioned in industry discussions?"
    ],
    "Competitor": [
        "What are the latest developments from Competitor?",
        "How does Competitor compare to market leaders?"
    ]
}
```

### Test Custom Prompts
Use `simple_monitor.py` for interactive testing:
1. Choose option 2 (Custom prompt test)
2. Enter your company name
3. Enter your custom prompt
4. Get instant results

## Troubleshooting

### API Key Issues
- Check your `.env` file has correct keys
- Perplexity and Gemini are working
- ChatGPT key currently has issues (skip it)

### No Results
- Check internet connection
- Verify API keys are valid
- Try simpler prompts first

### Python Errors
```bash
# Make sure you're in the right environment
source venv310/bin/activate

# Check if packages are installed
pip list | grep -E "(openai|httpx|google-generativeai)"
```

## Next Steps

1. **Start with simple_monitor.py** to test functionality
2. **Move to batch_monitor.py** for regular monitoring
3. **Set up daily cron job** for automation
4. **Customize companies and prompts** for your needs

No servers, no databases, no complexity - just simple monitoring that works! 