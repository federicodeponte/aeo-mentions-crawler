# Content-Manager UI Testing Guide

## ✅ Complete Integration Test Flow

This guide shows you how to test the full content-manager integration from context analysis to keyword generation in the UI.

---

## 🚀 Prerequisites

1. **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/apikey)
2. **Dev Server Running**: `npm run dev`
3. **Test Client**: Use any real company website (e.g., `valoon.chat`, `scaile.tech`)

---

## 📊 TEST 1: Context Page (Company Analysis)

### Navigate to Context Page
1. Open browser: `http://localhost:3000`
2. Login with your account
3. Click **"Context"** in the navigation menu
4. You should see the company analysis form

### Add API Key (First Time Only)
1. Click **Settings** (top right)
2. Enter your Gemini API key
3. Click **Save**
4. API key stored in localStorage

### Analyze a Company
1. Enter website URL: `https://valoon.chat`
2. Click **"Analyze Website"**
3. Wait ~30 seconds (progress bar shows)

### ✅ Expected Results:

**Company Details Extracted:**
```
✅ Company Name: Valoon GmbH
✅ Industry: ConstructionTech
✅ Description: German ConstructionTech startup...
✅ Products: [Valoon Platform, WhatsApp Integration, ...]
✅ Services: [Onboarding, Custom integration, ...]
```

**Hyper-Niche Data (KEY!):**
```
✅ Target Audience: 
   - Construction companies
   - Craftsmanship businesses (SMEs)  <-- Company size!
   - Property management companies

✅ Primary Region: Germany  <-- Specific geography!
```

**Pain Points & Use Cases:**
```
✅ Pain Points: [Communication gaps, Documentation issues, ...]
✅ Use Cases: [WhatsApp communication, Team collaboration, ...]
✅ Value Propositions: [Simplified communication, ...]
```

### ⚠️  What to Check:

1. **Company Sizes Detected**:
   - Look for: "startups", "SMEs", "enterprise", "small business", "mid-market"
   - Example: ✅ "Craftsmanship businesses (SMEs)"

2. **Specific Geography**:
   - Look for specific countries/regions: "Germany", "DACH", "UK", "France"
   - Avoid generic: ❌ "Global", ❌ "Worldwide", ❌ "US"
   - Example: ✅ "Germany"

3. **Rich Context Fields**:
   - Products, Services, Pain Points, Use Cases should all be populated
   - Not just basic info (name, industry)

---

## 📊 TEST 2: Keyword Generation (Using Context)

### Navigate to Keyword Generation
1. From Context page, click **"Generate Keywords"** or navigate to keywords page
2. Form should auto-populate with context data from analysis

### Verify Auto-Population
```
✅ Company Name: Valoon GmbH (from context)
✅ Website: https://valoon.chat (from context)
✅ Industry: ConstructionTech (from context)
✅ Products: Valoon Platform, WhatsApp Integration (from context)
✅ Services: Onboarding, Custom integration (from context)
✅ Target Audience: Construction companies, SMEs (from context)
```

### Generate Keywords
1. Set **Target Count**: 15 (for testing)
2. Set **Language**: English
3. Set **Country**: Germany (or relevant)
4. Click **"Generate Keywords"**
5. Wait ~2-4 minutes (shows progress)

### ✅ Expected Results:

**Quality Metrics (Displayed in UI):**
```
✅ Total Keywords: 15
✅ Natural Keywords: 100% (15/15)
✅ Product-Name Keywords: 0% (0/15)
✅ Hyper-Niche Keywords: 60-80% (9-12/15)
✅ Average Word Count: 6-8 words
```

**Sample Keywords (Construction Tech):**
```
✅ "whatsapp communication platform for construction companies Germany" [GEO, INDUSTRY]
   Score: 96, Intent: commercial, Words: 7

✅ "get construction project management software for smes" [SIZE]
   Score: 94, Intent: transactional, Words: 7

✅ "find construction communication platform for craftsmen" [INDUSTRY]
   Score: 93, Intent: transactional, Words: 6

✅ "best construction documentation software Germany 2025" [GEO]
   Score: 92, Intent: commercial, Words: 6

✅ "hire construction tech consultant for mid-size companies" [SIZE]
   Score: 91, Intent: transactional, Words: 7
```

### ⚠️  Critical Quality Checks:

1. **NO Product Names** ❌:
   - Bad: "buy Valoon Platform for construction"
   - Bad: "get Valoon WhatsApp Integration"
   - These are NOT how real users search!

2. **Natural Language** ✅:
   - Good: "whatsapp communication platform for construction"
   - Good: "get construction management software"
   - Good: "find construction communication tool"

3. **Hyper-Niche Modifiers** ✅:
   - **GEO**: "Germany", "Berlin", "DACH region"
   - **SIZE**: "for SMEs", "for startups", "for enterprise"
   - **INDUSTRY**: "construction", "craftsmen", "contractors"

4. **Long-Tail** ✅:
   - Most keywords should be 6-8 words
   - Minimum 4 words
   - Avoid short generic keywords

---

## 📊 TEST 3: Different Clients

### Test with SCAILE.tech (AEO/MarTech)

**Expected Context:**
```
✅ Industry: MarTech / AEO
✅ Target Audience: B2B SaaS startups, SMEs, Enterprise
✅ Primary Region: Germany (DACH)
✅ Services: AEO Consulting, AI Visibility Diagnostic
```

**Expected Keywords:**
```
✅ "get aeo consulting services for martech startups Germany" [INDUSTRY, SIZE, GEO]
✅ "hire agency for google ai overview optimization services"
✅ "best chatgpt search visibility services for enterprise" [SIZE]
✅ "find answer engine optimization agency for startups" [SIZE]
```

### Test with Any Client

**Requirements:**
1. Website must be accessible (not behind auth)
2. Should have clear products/services
3. Should mention target customers

**Good Test URLs:**
- `https://valoon.chat` (ConstructionTech)
- `https://scaile.tech` (MarTech/AEO)
- `https://shopify.com` (E-commerce platform)
- `https://figma.com` (Design tools)

---

## 🐛 Common Issues & Fixes

### Issue 1: "Failed to analyze website"
**Possible Causes:**
- Invalid API key
- Rate limit exceeded
- Website blocked or offline

**Fix:**
- Check API key in Settings
- Wait 60 seconds and retry
- Try a different website

---

### Issue 2: Generic Keywords (No Hyper-Niche)
**Symptoms:**
- Keywords like "best software" (too broad)
- No geo/size/industry modifiers
- Product names appearing

**Fix:**
- Check that company analysis extracted:
  - Target audience with company sizes
  - Specific primary region (not "Global")
- Re-analyze the website
- Try a different company with clearer positioning

---

### Issue 3: Product Name Keywords
**Symptoms:**
- Keywords like "buy Valoon Platform"
- Keywords like "get AI Visibility Engine"

**This should NOT happen!** If it does:
1. Check openkeyword version: Should be latest (commit `07ac246`)
2. Update submodule:
   ```bash
   cd python-services/openkeyword
   git pull origin main
   cd ../..
   git add python-services/openkeyword
   git commit -m "chore: sync openkeyword"
   ```

---

### Issue 4: Python Script Errors
**Symptoms:**
- "Failed to generate keywords"
- Python import errors

**Fix:**
```bash
# Verify Python path
cd content-manager
export PYTHONPATH="${PYTHONPATH}:$(pwd)/python-services/openkeyword"

# Test imports
python3 -c "import sys; sys.path.insert(0, 'python-services/openkeyword'); from openkeywords.generator import KeywordGenerator; print('✅ Import OK')"
```

---

## 📊 UI Elements to Verify

### Context Page (`/context`)
- [ ] Form with URL input
- [ ] "Analyze Website" button
- [ ] Progress bar during analysis (30s)
- [ ] Results display with all fields
- [ ] Success message on completion
- [ ] Data persisted (reload page, still there)

### Keywords Page
- [ ] Form auto-populated from context
- [ ] All fields editable (can override context)
- [ ] Target count selector (10-100)
- [ ] Language/country selectors
- [ ] "Generate Keywords" button
- [ ] Progress indicator (2-4 mins)
- [ ] Results table with all keywords
- [ ] Quality metrics displayed
- [ ] Export buttons (CSV, JSON)
- [ ] Cluster grouping (if enabled)

---

## 🎯 Success Criteria

### ✅ Context Analysis
- [x] Successfully analyzes website
- [x] Extracts company name, industry, description
- [x] Extracts products AND services
- [x] Extracts target audience with company sizes
- [x] Extracts specific primary region (not "Global")
- [x] Extracts pain points, use cases, value props
- [x] Data persists in localStorage
- [x] Can be used for keyword generation

### ✅ Keyword Generation
- [x] Uses context from analysis
- [x] Generates 100% natural keywords (0% product names)
- [x] Generates 60-80% hyper-niche keywords with modifiers
- [x] Average 6-8 words per keyword
- [x] Keywords relevant to company's business
- [x] Keywords include geo/size/industry modifiers
- [x] Can export to CSV/JSON
- [x] Quality metrics displayed

---

## 🔧 Manual Testing Checklist

### Day 1: Basic Flow
- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Add Gemini API key in Settings
- [ ] Test context analysis with `valoon.chat`
- [ ] Verify extracted data quality
- [ ] Test keyword generation with extracted context
- [ ] Verify keyword quality (natural, hyper-niche)

### Day 2: Edge Cases
- [ ] Test with different industries (SaaS, E-commerce, FinTech)
- [ ] Test with different regions (US, Europe, APAC)
- [ ] Test with different company sizes (Startup, SME, Enterprise)
- [ ] Test error handling (invalid URL, API timeout)
- [ ] Test data persistence (refresh page)
- [ ] Test export functionality (CSV, JSON)

### Day 3: Quality Validation
- [ ] Manually review 10 companies' keywords
- [ ] Verify no product names in keywords
- [ ] Verify geo/size/industry modifiers present
- [ ] Verify average word count 6-8 words
- [ ] Compare to previous version (if applicable)
- [ ] Document any quality issues

---

## 📝 Reporting Results

**When reporting test results, include:**

1. **Company Tested**: URL and industry
2. **Context Quality**:
   - ✅ or ❌ Company sizes detected
   - ✅ or ❌ Specific geography detected
   - ✅ or ❌ Rich context fields populated
3. **Keyword Quality**:
   - % Natural keywords (target: 100%)
   - % Product-name keywords (target: 0%)
   - % Hyper-niche keywords (target: 60-80%)
   - Avg word count (target: 6-8)
4. **Sample Keywords**: Top 5 with modifiers
5. **Issues Found**: Any bugs or unexpected behavior

---

## 🚀 Ready for Production?

### Checklist:
- [ ] Context analysis working for 10+ companies
- [ ] Keyword generation working for 10+ companies
- [ ] Quality metrics consistently good (100% natural, 60-80% hyper-niche)
- [ ] No product names in generated keywords
- [ ] Average word count 6-8 words
- [ ] Export functionality working
- [ ] Error handling graceful
- [ ] UI responsive and intuitive
- [ ] Data persistence working
- [ ] Integration with openkeyword verified

**If all checks pass → SHIP IT! 🚀**

