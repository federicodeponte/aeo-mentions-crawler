# Vercel Python Serverless Functions

**On-Demand Utilities (Not Persistent Services)**

This directory contains Python serverless functions that run on Vercel's Python runtime. They execute **on-demand** only when called - no persistent processes, no background polling, no container overhead.

## Why Serverless Functions Instead of Services?

### ❌ Old Approach (Persistent Services)
- Had to run FastAPI servers on `localhost:8001` and `localhost:8002`
- Only worked in local development
- **Could not deploy to Vercel** (no persistent processes allowed)
- Would have needed separate cloud deployment (Modal, AWS Lambda, etc.)

### ✅ New Approach (Serverless Functions)
- **On-demand execution** - runs only when called
- Works **locally AND on Vercel** with zero config changes
- No separate deployment needed
- Scales automatically (0 → infinity)
- Pay only for actual execution time

## How It Works

### Local Development
```
Next.js API Route → Python subprocess (via scripts/)
```

### Production (Vercel)
```
Next.js API Route → Vercel Python Function (same codebase, different runtime)
```

## Files

### `api/python/generate-blog.py`
**Purpose:** Generate AEO-optimized blog articles using 13-stage pipeline

**Endpoint:** `/api/python/generate-blog`

**Input:**
```json
{
  "primary_keyword": "AI search visibility",
  "company_name": "SCAILE",
  "company_url": "https://scaile.tech",
  "language": "en",
  "country": "US",
  "word_count": 1000,
  "tone": "professional",
  "system_prompts": ["Focus on AEO", "Include AI search variations"],
  "company_data": {
    "description": "...",
    "industry": "...",
    "target_audience": ["..."],
    "competitors": ["..."]
  }
}
```

**Output:**
```json
{
  "success": true,
  "job_id": "blog_ai_search_visibility",
  "headline": "How AI Search Visibility...",
  "html_content": "<article>...</article>",
  "meta_title": "...",
  "meta_description": "...",
  "word_count": 1042,
  "aeo_score": 85,
  "read_time": 5,
  "slug": "ai-search-visibility"
}
```

### `api/python/generate-keywords.py`
**Purpose:** Generate strategic keywords optimized for answer engines

**Endpoint:** `/api/python/generate-keywords`

**Input:**
```json
{
  "company_name": "SCAILE",
  "company_url": "https://scaile.tech",
  "company_description": "...",
  "industry": "AI Marketing",
  "target_audience": "B2B SaaS",
  "products": ["AI Visibility Engine"],
  "competitors": ["Surfer SEO"],
  "language": "en",
  "country": "US",
  "target_count": 50,
  "mode": "generate"  // or "refresh"
}
```

**Output:**
```json
{
  "keywords": [
    {
      "keyword": "answer engine optimization",
      "intent": "informational",
      "score": 92,
      "cluster_name": "AEO Basics",
      "is_question": false,
      "source": "ai_generated",
      "volume": 1200,
      "difficulty": 45,
      "aeo_opportunity": 85
    }
  ],
  "metadata": {
    "total_keywords": 50,
    "mode": "generate",
    "generation_time": 12.5
  }
}
```

### `requirements.txt`
Python dependencies for both functions. Keep this minimal for fast cold starts.

## Deployment

### Environment Variables (Vercel Dashboard)
```bash
GEMINI_API_KEY=your_key_here
SERANKING_API_KEY=your_key_here  # Optional for advanced keyword research
NODE_ENV=production
```

### Vercel Configuration (`vercel.json`)
```json
{
  "functions": {
    "api/python/*.py": {
      "runtime": "python3.9",
      "maxDuration": 300,
      "memory": 3008
    }
  }
}
```

### Deployment Command
```bash
# Push to main branch
git push origin main

# Vercel automatically:
# 1. Detects Python files in api/python/
# 2. Installs requirements.txt
# 3. Creates serverless functions
# 4. Routes /api/python/* to Python runtime
```

## How Next.js Routes to Python

The Next.js API routes (`app/api/generate-blog/route.ts`, etc.) automatically detect the environment:

```typescript
const isDev = process.env.NODE_ENV === 'development'

const endpoint = isDev 
  ? 'http://localhost:8001'           // Local: subprocess or dev server
  : '/api/python/generate-blog'       // Production: Vercel Python function
```

## Performance Characteristics

### Cold Start
- First request: ~2-5 seconds (imports + initialization)
- Subsequent requests: ~200-500ms (warm container)

### Execution Time
- Blog generation: 60-120 seconds (13-stage pipeline)
- Keyword generation: 10-30 seconds (AI + research)

### Memory Usage
- Blog writer: ~1.5-2 GB (Playwright + AI models)
- Keywords: ~800 MB - 1.2 GB (AI models only)

### Timeout
- Configured for 300 seconds (5 minutes) max
- Blog generation typically completes in 60-120 seconds
- Keywords complete in 10-30 seconds

## Local Development

### Option 1: Python Subprocess (Current)
```bash
# Already configured in generate-blog/route.ts
# Runs Python script directly via spawn()
npm run dev
```

### Option 2: Local Serverless Functions (Optional)
```bash
# Start local dev servers (optional for testing)
cd python-services
./start-services.sh

# These mimic production behavior locally
# Blog: http://localhost:8001
# Keywords: http://localhost:8002
```

## Advantages Over Modal/Lambda

### Modal Comparison
| Feature | Modal | Vercel Functions |
|---------|-------|------------------|
| **Deploy** | Separate deploy | Auto with Next.js |
| **Networking** | Public endpoint | Same origin |
| **Auth** | Separate API key | Same Next.js auth |
| **Costs** | $0.30/hr minimum | Pay-per-execution |
| **Cold starts** | ~1-2s | ~2-5s |

### AWS Lambda Comparison
| Feature | AWS Lambda | Vercel Functions |
|---------|------------|------------------|
| **Setup** | IAM, API Gateway, etc. | Zero config |
| **Deploy** | Separate pipeline | Auto with git push |
| **Monitoring** | CloudWatch | Vercel Dashboard |
| **Pricing** | Complex tiers | Simple per-ms |

## Monitoring

### Vercel Dashboard
- View function logs: **Deployments → Functions**
- See execution time: **Analytics → Functions**
- Monitor errors: **Analytics → Errors**

### Log Output
Functions automatically log to Vercel:
```python
print("[BLOG] Starting generation...")  # Visible in Vercel logs
```

## Troubleshooting

### "Function exceeded timeout"
- Increase `maxDuration` in `vercel.json`
- Current: 300 seconds (5 minutes)
- Max allowed: 300 seconds (Hobby), 900 seconds (Pro)

### "Module not found"
- Add missing package to `requirements.txt`
- Redeploy: `git push origin main`

### "Memory limit exceeded"
- Increase `memory` in `vercel.json`
- Current: 3008 MB (max on Pro plan)

### Cold starts too slow
- Consider keeping functions "warm" with periodic pings
- Or accept 2-5s cold start for cost savings

## Cost Estimation

### Vercel Pricing (Pro Plan)
- **GB-Hours**: $0.00001/GB-second
- **Execution Time**: $0.00001/second

**Example calculation (blog generation):**
- Memory: 2 GB
- Duration: 90 seconds
- Cost per execution: 2 GB × 90s × $0.00001 = **$0.0018** (~$0.002)

**100 blogs/day:**
- Daily: $0.20
- Monthly: ~$6
- Much cheaper than persistent Modal/Lambda containers!

## Security

### API Keys
- Stored in Vercel environment variables
- Never exposed to client
- Accessed via `os.getenv()`

### Request Validation
- All inputs validated in Next.js API route first
- Python functions assume pre-validated data

### Rate Limiting
- Handled by Next.js middleware/API routes
- Not in Python functions (too late)

## Future Enhancements

- [ ] Add caching layer (Redis/KV) for expensive operations
- [ ] Implement streaming responses for real-time progress
- [ ] Add request queuing for high concurrency
- [ ] Pre-warm functions during deploys
- [ ] Add retry logic with exponential backoff

---

**Summary:** These are lightweight, on-demand utilities that run only when called. Perfect for occasional heavy computation without the overhead of persistent services.

