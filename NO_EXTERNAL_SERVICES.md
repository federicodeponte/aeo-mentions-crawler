# NO EXTERNAL SERVICES - Migration Plan

## ✅ Completed (Helper Scripts)

1. **Context Analysis** - Direct Gemini API calls
2. **Keywords Generation** - Helper script (subprocess/Vercel function)
3. **Blog Generation** - Helper script (subprocess/Vercel function)
4. **Health Check** - Local TypeScript lib
5. **Mentions Check** - Helper script (subprocess/Vercel function) ✅ JUST DONE

## ❌ Still Using Modal

### Batch Processing (`/api/process`)
**Current:** Calls Modal bulk processor for parallel CSV processing

**Why it's complex:**
- Processes 100-1000 rows in parallel
- Long-running jobs (24hr timeout)
- Uses Modal's polling architecture
- Modal container orchestration

**Options to remove Modal:**

### Option 1: Vercel Background Functions (Best)
```typescript
// Use Vercel's queue system
import { queue } from '@vercel/functions'

export const processQueue = queue({
  maxConcurrency: 10,
  timeout: '5m'
})
```
- Vercel handles queuing and parallel execution
- No external service needed
- Scales automatically

### Option 2: Simple Sequential Processing
```typescript
// Process rows one by one
for (const row of rows) {
  await processRow(row)
}
```
- Dead simple
- Slower but works
- No external dependencies

### Option 3: Client-Side Batch (Progressive Web App)
```typescript
// Let browser handle parallel requests
await Promise.all(rows.map(row => 
  fetch('/api/process-single', { body: row })
))
```
- No server orchestration
- Works offline
- Browser does the work

## Recommendation

**For simplicity: Option 2 (Sequential)**
- Just loop through rows
- Process one at a time
- No Modal, no queues, no complexity
- If it's slow, that's okay (shows progress)

**Want me to implement this?**

It would remove the last external service dependency.

