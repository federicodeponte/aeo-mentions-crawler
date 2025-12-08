# 🔧 Streaming Progress Fix

## ❌ Problem

The streaming endpoint (`/api/generate-keywords-stream`) crashes the Next.js dev server with "Connection reset by peer".

**Root Cause:** `child_process.spawn()` is not fully supported in Next.js App Router **development mode**.

## ✅ Quick Fix: Fallback Strategy

Since streaming requires `spawn()`, and the regular endpoint also uses `spawn()`, we have two options:

### Option 1: Use Mock Progress (Development Only)
For dev testing, show simulated progress without real streaming.

### Option 2: Fix the Existing Endpoint
The regular `/api/generate-keywords` endpoint should work - let me verify the issue.

Let me check if the issue is with **ALL** routes or just streaming...

## 🔍 Investigation

Testing showed **both endpoints crash**, which means the issue is not streaming-specific but rather with the Python script execution setup.

## 💡 Solution: Fix Python Execution

The issue is likely:
1. Python path resolution
2. Environment variables not passed to spawned process
3. API key not accessible in child process

Let me implement a proper fix...

