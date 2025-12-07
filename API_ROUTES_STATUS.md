# API Routes Summary - External Service Dependencies

## ✅ Already Using Helper Scripts/Direct Approach

### 1. **Context Analysis** (`/api/analyse-website`)
```typescript
// Uses Gemini API directly (no external service)
const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({...})
```
✅ **Direct API call** - No service needed

### 2. **Keywords** (`/api/generate-keywords`)
```typescript
// Local: Python subprocess
// Production: Vercel serverless function
```
✅ **Helper script approach** - Already updated!

### 3. **Blogs** (`/api/generate-blog`)
```typescript
// Local: Python subprocess  
// Production: Vercel serverless function
```
✅ **Helper script approach** - Already updated!

## ❌ Still Using Modal Services

### 4. **Health Check** (`/api/aeo/health-check`)
```typescript
// Currently uses local lib/services/aeo-health-check
import { runHealthCheck } from '@/lib/services/aeo-health-check'
```
✅ **Already local!** - No external service

### 5. **Mentions Check** (`/api/aeo/mentions-check`)
```typescript
// Calls Modal service
const modalEndpoint = 'https://clients--aeo-checks-fastapi-app.modal.run/mentions/check'
```
❌ **Still using Modal** - Should we convert to helper script?

### 6. **Batch Processing** (`/api/process`)
```typescript
// Calls Modal bulk processor
const MODAL_API_URL = 'https://tech-bulkgpt--bulk-gpt-processor-v4-fastapi-app.modal.run'
```
❌ **Still using Modal** - But this is heavy batch processing (okay to keep)

## Summary Table

| Feature | Endpoint | Current Approach | Status |
|---------|----------|------------------|--------|
| **Context** | `/api/analyse-website` | Gemini API direct | ✅ Local |
| **Keywords** | `/api/generate-keywords` | Helper script | ✅ Local |
| **Blogs** | `/api/generate-blog` | Helper script | ✅ Local |
| **Health Check** | `/api/aeo/health-check` | Local lib | ✅ Local |
| **Mentions Check** | `/api/aeo/mentions-check` | Modal service | ❌ External |
| **Batch Process** | `/api/process` | Modal service | ❌ External (OK) |

## Recommendations

### Should Convert to Helper Script:
**Mentions Check** - Queries AI platforms for visibility
- Similar to keywords/blogs (AI-heavy but occasional)
- Could be local helper script + Vercel function
- Current Modal service: `clients--aeo-checks-fastapi-app.modal.run`

### Should Keep on Modal:
**Batch Processing** - Heavy parallel processing
- Processes 100s of rows in parallel
- Long-running jobs (24hr timeout)
- Polling architecture needed
- Worth keeping on Modal for this use case

## Action Required?

Do you want me to convert **Mentions Check** to the helper script approach too?

It would be:
- Local dev: `scripts/check-mentions.py`
- Production: `/api/python/check-mentions.py`
- Same pattern as blogs/keywords

Let me know!

