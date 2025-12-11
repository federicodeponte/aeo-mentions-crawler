# Render Deployment Guide - hyperniche-ai

Since the API deployment is blocked by repository access restrictions, use this manual deployment guide to deploy the hyperniche-ai application to Render with 30-minute timeouts.

## 🎯 Why Render vs Vercel

- ✅ **30-minute timeout** vs Vercel's 5-minute limit
- ✅ **Better for AI processing** - No serverless restrictions  
- ✅ **Standard plan** provides more compute power
- ✅ **Longer-running** keyword generation and AEO analysis

## 📋 Prerequisites

1. ✅ Repository ready: `https://github.com/federicodeponte/openaeomachine`
2. ✅ Render API key: `***RENDER-API-KEY-REMOVED***`
3. ✅ Docker configuration added (`Dockerfile`, `.dockerignore`)
4. ✅ API routes updated for 30-minute timeouts

## 🚀 Manual Deployment Steps

### 1. Create New Web Service

1. Go to: https://dashboard.render.com
2. Click **"New"** → **"Web Service"**
3. Connect repository:
   - Repository URL: `https://github.com/federicodeponte/openaeomachine`
   - Branch: `main`

### 2. Service Configuration

```
Service Name: hyperniche-ai
Runtime: Node.js
Build Command: npm install && npm run build  
Start Command: npm start
Plan: Standard (CRITICAL for 30-minute timeouts)
```

### 3. Environment Variables

Add these exact environment variables in Render dashboard:

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://hyperniche-ai.onrender.com
GEMINI_API_KEY=[REMOVED_API_KEY]
OPENROUTER_API_KEY=***OPENROUTER-API-KEY-REMOVED***
SERANKING_API_KEY=***SERANKING-API-KEY-REMOVED***
DATAFORSEO_LOGIN=tech@scaile.it
DATAFORSEO_PASSWORD=***DATAFORSEO-PASSWORD-REMOVED***
NEXT_PUBLIC_SUPABASE_URL=https://uomowytwgzrsonjkddql.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvbW93eXR3Z3pyc29uamtkZHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDg1NzMsImV4cCI6MjA3OTEyNDU3M30.HRbnviDhUdsgWPD3bsNZbW14xJjQq59bpjIaeAQ9s9I
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvbW93eXR3Z3pyc29uamtkZHFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU0ODU3MywiZXhwIjoyMDc5MTI0NTczfQ.HRtmeDw5hdsO0MVMrBVROwhM8GJK6P0nJ2Qz2KrdOEI
```

### 4. Advanced Settings

- **Auto-deploy**: Enable (deploys on every git push)
- **Health Check Path**: `/` (default)

## 🔄 Auto-Deployment Setup

### Option A: Render Auto-Deploy (Recommended)

Enable "Auto-deploy" in Render dashboard settings. This will automatically deploy on every push to the main branch.

### Option B: GitHub Actions (Advanced)

If you want more control over deployments, create `.github/workflows/deploy-render.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application  
      run: npm run build
      
    - name: Deploy to Render
      uses: johnbeynon/render-deploy-action@v0.0.8
      with:
        service-id: ${{ secrets.RENDER_SERVICE_ID }}
        api-key: ${{ secrets.RENDER_API_KEY }}
        wait-for-success: true
```

**Required GitHub Secrets:**
- `RENDER_API_KEY`: `***RENDER-API-KEY-REMOVED***`
- `RENDER_SERVICE_ID`: (get this from Render dashboard after creating service)

## 📊 Monitoring Deployment

### Via Render Dashboard

1. Go to your service: https://dashboard.render.com/web/YOUR_SERVICE_ID
2. Monitor "Events" tab for build progress
3. Check "Logs" tab for runtime logs

### Via API

```bash
# Get service status
curl -H "Authorization: Bearer ***RENDER-API-KEY-REMOVED***" \
  "https://api.render.com/v1/services/YOUR_SERVICE_ID"

# Get deployment logs
curl -H "Authorization: Bearer ***RENDER-API-KEY-REMOVED***" \
  "https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys"
```

## 🎯 Expected Results

### Successful Deployment

- **URL**: https://hyperniche-ai.onrender.com
- **Build Time**: 3-5 minutes (first deploy)
- **Status**: "Live" in Render dashboard
- **Features Working**:
  - ✅ Keyword generation (30-minute timeout)
  - ✅ AEO health checks
  - ✅ Blog generation
  - ✅ Context analysis
  - ✅ All AI processing features

### Performance Benefits

| Feature | Vercel Limit | Render Limit | Improvement |
|---------|-------------|-------------|-------------|
| Keyword Generation | 5 minutes | 30 minutes | **6x longer** |
| Blog Creation | 5 minutes | 30 minutes | **6x longer** |
| AEO Analysis | 5 minutes | 30 minutes | **6x longer** |
| Batch Processing | Timeout errors | Full completion | **Reliable** |

## 🐛 Troubleshooting

### Common Issues

**1. Build Fails**
- Check Node.js version is 20+ in logs
- Verify all environment variables are set
- Check for missing dependencies

**2. Runtime Errors**  
- Check SUPABASE_* environment variables are correct
- Verify API keys are valid
- Check application logs in Render dashboard

**3. Timeout Issues**
- Confirm Plan is set to "Standard" (not Free/Starter)
- Check API routes have `maxDuration = 1800` (30 minutes)

**4. Auto-deploy Not Working**
- Verify "Auto-deploy" is enabled in settings
- Check webhook is configured correctly
- Ensure latest code is pushed to main branch

## 📞 Support

If issues persist:

1. **Check Logs**: Render Dashboard → Your Service → Logs
2. **Verify Config**: Compare environment variables with this guide  
3. **Test Locally**: Run `npm run build && npm start` locally first
4. **API Test**: Use `curl` commands above to check service status

## ✅ Completion Checklist

- [ ] Service created in Render dashboard
- [ ] Repository connected: `openaeomachine`
- [ ] Plan set to **Standard** 
- [ ] All environment variables added
- [ ] Auto-deploy enabled
- [ ] First deployment successful
- [ ] Application accessible at https://hyperniche-ai.onrender.com
- [ ] Keyword generation working (30-minute timeout)
- [ ] GitHub Actions configured (optional)

🎉 **Once completed, hyperniche-ai will be live on Render with 30-minute timeouts instead of Vercel's 5-minute limitation!**