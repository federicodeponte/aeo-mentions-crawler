# AI Visibility Monitor - Organic Company Monitoring

**Simple, no-server AI monitoring that actually works**

## What This Does

AI Visibility Monitor tests whether your company appears **organically** in AI model responses when people ask **generic industry questions** - without mentioning your company name.

**Example:**
- ❌ Wrong: "What are the competitors of Scaile?"
- ✅ Right: "What are the best marketing automation tools?" (then check if Scaile appears)

## Quick Start

### 1. Setup
```bash
# Clone and setup
git clone https://github.com/yourusername/peec-ai-copy.git
cd peec-ai-copy

# Install dependencies
pip install -r requirements.txt

# Copy environment file and add your API keys
cp .env.example .env
# Edit .env with your API keys
```

### 2. Run Monitoring
```bash
# Activate environment
source venv310/bin/activate

# Run organic monitoring (no inputs required)
python run_monitor.py
```

## What You Get

**Real Results from Latest Run:**
- **Scaile**: 0 mentions across 10 digital marketing questions (0.0% visibility)
- **Valoon**: 0 mentions across 10 construction questions (0.0% visibility)

This means when people ask AI about "best marketing tools" or "construction communication platforms", these companies don't appear organically.

## Available Scripts

### `run_monitor.py` - Main Monitoring (Recommended)
- Tests generic industry questions
- Checks for organic company mentions
- Saves detailed JSON results
- No user input required

### `simple_monitor.py` - Interactive Testing
- Menu-driven interface
- Custom prompt testing
- Single company focus

### `batch_monitor.py` - Batch Processing
- Multiple companies at once
- Automated report generation
- Summary statistics

### `daily_cron.py` - Automated Daily Runs
- Set up with cron for daily monitoring
- Email notifications
- Automated logging

## API Keys Required

Add these to your `.env` file:
```env
PERPLEXITY_API_KEY=your_perplexity_key
GEMINI_API_KEY=your_gemini_key
SERPER_API_KEY=your_serper_key (optional)
```

## Cost Analysis

**Per Run (10 questions, 2 models):**
- Perplexity: ~$0.10-0.20
- Gemini: ~$0.05-0.10
- **Total: ~$0.15-0.30 per run**

**Monthly (daily runs): ~$5-10/month**

## Customization

Edit `run_monitor.py` to add your companies:

```python
# Companies we're monitoring for
companies_to_monitor = ["YourCompany", "Competitor"]

# Add your industry questions
industry_prompts = {
    "your_industry": [
        "What are the best tools for your industry?",
        "Which companies lead in your industry innovation?",
        "What platforms are recommended for your use case?"
    ]
}
```

## Why This Approach Works

1. **Tests Real Visibility** - Generic questions reveal actual AI recommendation patterns
2. **No Server Complexity** - Just run Python scripts
3. **Actionable Results** - 0% visibility means you need better AI/SEO presence
4. **Cost Effective** - $5-10/month vs $100s for server hosting

## Results Files

- `organic_monitor_YYYYMMDD_HHMM.json` - Detailed results
- `monitor_results_YYYYMMDD_HHMM.json` - Summary data
- Console output shows real-time progress

## Daily Automation

Set up daily monitoring with cron:
```bash
# Edit crontab
crontab -e

# Add daily 9 AM monitoring
0 9 * * * cd /path/to/peec-ai-copy && source venv310/bin/activate && python run_monitor.py
```

## Architecture

```
AI Visibility Monitor Simple Architecture
┌─────────────────┐    ┌─────────────────┐
│   Generic       │    │   AI Models     │
│   Questions     │───▶│   Perplexity    │
│                 │    │   Gemini        │
└─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Check for     │
                       │   Organic       │
                       │   Mentions      │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   JSON Results  │
                       │   & Reports     │
                       └─────────────────┘
```

## Key Features

- **Organic Monitoring**: Tests real AI visibility without bias
- **Multiple Models**: Perplexity, Gemini (working models)
- **Link Analysis**: Extracts and analyzes source URLs
- **Zero Server Costs**: Just run scripts locally or with cron
- **Detailed Reporting**: JSON results with full response data

## Next Steps

1. **Test Current Setup**: Run `python run_monitor.py`
2. **Add Your Companies**: Edit the companies list
3. **Set Up Daily Automation**: Use cron for regular monitoring
4. **Analyze Results**: Use 0% visibility as action item for SEO/AI presence

## Troubleshooting

**No Results?**
- Check API keys in `.env`
- Verify internet connection
- Try simpler prompts first

**Python Errors?**
```bash
# Ensure correct environment
source venv310/bin/activate
pip install -r requirements.txt
```

## Contributing

This is a working MVP. To improve:
1. Add more industry categories
2. Improve mention detection accuracy
3. Add more AI models
4. Create web dashboard (optional)

---

**AI Visibility Monitor: Simple, effective, no-server AI monitoring that gives you real competitive intelligence.** 