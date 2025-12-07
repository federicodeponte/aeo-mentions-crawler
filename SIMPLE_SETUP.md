# Simple Setup: Helper Scripts ✅

## Dead Simple Approach

**Local dev:** Python helper scripts (subprocess)  
**Production:** Vercel serverless functions  

No services to start. No Docker. No containers. Just works.

## Local Development

```bash
npm run dev  # That's it!
```

When you generate a blog or keywords, Next.js automatically calls the Python scripts:
- `scripts/generate-blog.py`
- `scripts/generate-keywords.py`

## Production (Vercel)

```bash
git push origin main  # Auto-deploys serverless functions
```

Vercel automatically creates:
- `/api/python/generate-blog` → `api/python/generate-blog.py`
- `/api/python/generate-keywords` → `api/python/generate-keywords.py`

## How It Works

### Next.js API Routes
```typescript
const isDev = process.env.NODE_ENV === 'development'

if (isDev) {
  // Call Python script directly via subprocess
  const python = spawn('python3', ['scripts/generate-blog.py'])
} else {
  // Call Vercel serverless function
  await fetch('/api/python/generate-blog')
}
```

### Python Scripts (Local)
- Located in `scripts/`
- Read JSON from stdin
- Write JSON to stdout
- Simple, fast, no HTTP overhead

### Python Functions (Production)
- Located in `api/python/`
- HTTP request/response
- Auto-scaled by Vercel
- Same code logic as scripts

## File Structure

```
scripts/
├── generate-blog.py        # Local helper (subprocess)
└── generate-keywords.py    # Local helper (subprocess)

api/python/
├── generate-blog.py        # Production (Vercel function)
├── generate-keywords.py    # Production (Vercel function)
└── requirements.txt        # Python dependencies

app/api/
├── generate-blog/route.ts  # Detects dev vs prod
└── generate-keywords/route.ts
```

## No Services Needed!

You DON'T need to run:
- ❌ `./start-services.sh`
- ❌ `docker compose up`
- ❌ Any background processes

Just `npm run dev` and it works. 🎉

## Dependencies

Python packages auto-installed when needed:
```bash
# If you haven't installed them yet:
cd python-services/blog-writer && pip install -r requirements.txt
cd ../openkeyword && pip install -r requirements.txt
```

## Cost

**Local:** Free (runs on your machine)  
**Production:** ~$0.002 per blog (Vercel serverless)

## Summary

- **Simplest possible setup**
- **No services** to manage
- **Same codebase** works everywhere
- **Production-ready** out of the box

That's it! 🚀

