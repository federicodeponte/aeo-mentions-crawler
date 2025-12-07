# OpenBlog Integration - Setup Guide

## What's New

### 1. Local Python Services
The blog-writer and openkeyword Python services now run locally instead of Modal.

**Location:** `content-manager/python-services/`

**Services:**
- `blog-server.py` - Port 8001 - 13-stage blog generation pipeline  
- `keyword-server.py` - Port 8002 - Keyword generation with generate/refresh modes

### 2. Starting the Services

```bash
cd content-manager/python-services
./start-services.sh
```

This will:
- Create a Python virtual environment
- Install dependencies from blog-writer and openkeyword
- Start both servers in the background
- Save logs to `blog-server.log` and `keyword-server.log`

### 3. Stopping the Services

```bash
cd content-manager/python-services
./stop-services.sh
```

### 4. API Routes Updated

**Blog Generation:** `app/api/generate-blog/route.ts`
- Now calls `http://localhost:8001/generate`
- Uses full 13-stage openblog pipeline
- Supports batch generation with internal linking

**Keyword Generation:** `app/api/generate-keywords/route.ts`
- Now calls `http://localhost:8002/generate`
- Supports two modes:
  - `generate`: Fresh keyword generation (default)
  - `refresh`: Regenerate based on existing keywords

### 5. System Instructions

Added `systemInstructions` field to BusinessContext:
- Stored in localStorage with other context
- Reusable across keyword and blog generation
- Automatically loaded when present

**Usage in components:**
```typescript
const { businessContext } = useContextStorage()
const systemPrompts = businessContext.systemInstructions || ''
```

## Environment Variables

Add to `.env.local`:

```bash
# Python Service Endpoints (optional - defaults to localhost)
BLOG_WRITER_ENDPOINT=http://localhost:8001
KEYWORD_GENERATOR_ENDPOINT=http://localhost:8002

# Required for Python services
GEMINI_API_KEY=your_key_here
SERANKING_API_KEY=your_key_here  # Optional, for advanced keyword research
```

## Development Workflow

1. Start Python services: `./python-services/start-services.sh`
2. Start Next.js dev server: `npm run dev`
3. Both services run in parallel
4. Stop services when done: `./python-services/stop-services.sh`

## Features

### Keyword Generation Modes

**Generate (Fresh):**
```typescript
const response = await fetch('/api/generate-keywords', {
  method: 'POST',
  body: JSON.stringify({
    company_name: "Acme Corp",
    company_url: "acme.com",
    mode: "generate",  // Fresh generation
    target_count: 50
  })
})
```

**Refresh (Based on Existing):**
```typescript
const response = await fetch('/api/generate-keywords', {
  method: 'POST',
  body: JSON.stringify({
    company_name: "Acme Corp",
    company_url: "acme.com",
    mode: "refresh",  // Regenerate
    existing_keywords: ["saas platform", "crm software"],
    target_count: 50
  })
})
```

### Blog Generation with 13 Stages

The blog-writer pipeline includes:
0. Data Fetch
1. Prompt Build  
2. Gemini Call
2b. Quality Refinement
3. Extraction
4-9. Parallel Processing (Citations, Links, ToC, Metadata, FAQ, Images)
10. Cleanup
11. Storage
12. Review Iteration

All stages run automatically via `/api/generate-blog`.

## Next Steps (TODO)

- [ ] Add "Generate" vs "Refresh" button toggle in KeywordGenerator UI
- [ ] Add "System Instructions" text area in ContextForm
- [ ] Add progress updates for 13-stage blog generation (WebSocket/SSE)
- [ ] Test full parity with original openblog

## Troubleshooting

**Services not starting:**
```bash
# Check Python version
python3 --version  # Should be 3.9+

# Check ports
lsof -i:8001
lsof -i:8002

# Manual start for debugging
cd python-services
python blog-server.py
python keyword-server.py
```

**Import errors:**
```bash
cd python-services
source venv/bin/activate
pip install -r blog-writer/requirements.txt
pip install -r openkeyword/requirements.txt
```

