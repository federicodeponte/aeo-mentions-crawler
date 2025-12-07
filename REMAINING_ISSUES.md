# 🐛 Remaining Issues Found

**Date:** December 7, 2025

---

## 🔴 Critical Issues

### 1. **Missing `systemPrompts` in `handleGenerate` dependency array**
**Location:** Line 447

**Problem:**
```typescript
}, [batchMode, primaryKeyword, batchKeywords, wordCount, additionalInstructions, companyName, companyUrl, geminiApiKey, businessContext])
// Missing: systemPrompts
```

**Impact:** 
- `handleGenerate` uses `systemPrompts` (line 346, 358) but it's not in dependencies
- Could cause stale closures - old `systemPrompts` value used even after user edits

**Fix:** Add `systemPrompts` to dependency array

---

### 2. **Context loading overwrites user edits**
**Location:** Lines 198-215

**Problem:**
```typescript
useEffect(() => {
  // This runs whenever context changes
  if (businessContext.clientKnowledgeBase) {
    setSystemPrompts(businessContext.clientKnowledgeBase) // Overwrites user edits!
  }
  // ...
}, [businessContext.clientKnowledgeBase, ...])
```

**Impact:**
- User types in "Client Knowledge Base" field
- User edits save to context via `updateContext()`
- Context change triggers useEffect
- useEffect overwrites the field with same value (but loses cursor position/focus)
- Worse: If context updates from another tab/component, user's typing is lost

**Fix:** Only load from context on mount, or use a ref to track if user is editing

---

### 3. **Refresh button doesn't check for API key**
**Location:** Line 1034-1044

**Problem:**
```typescript
const response = await fetch('/api/refresh-blog', {
  // ...
  apiKey: geminiApiKey, // Could be null!
})
```

**Impact:**
- If user hasn't set API key, refresh will fail
- Should check and show error before making request

**Fix:** Add API key validation before fetch

---

## 🟡 Medium Issues

### 4. **State synchronization race condition**
**Location:** Lines 741-744, 763-766

**Problem:**
```typescript
onChange={(e) => {
  setSystemPrompts(e.target.value) // Update local state
  updateContext({ clientKnowledgeBase: e.target.value }) // Update context
}}
```

**Impact:**
- User edits field → saves to context → context change triggers useEffect → overwrites state
- Creates unnecessary re-renders
- Could cause flickering or cursor jumping

**Fix:** Use a ref to prevent useEffect from overwriting during user edits

---

### 5. **Inconsistent instruction format**
**Location:** Refresh button vs generation

**Problem:**
- **Generation** (line 346): `system_prompts: systemPrompts.trim().split('\n')` (array of strings)
- **Refresh** (line 1018): `instructions.push(\`Client Knowledge Base: ${value}\`)` (formatted string)

**Impact:**
- Different formats might confuse the backend
- Refresh uses formatted strings, generation uses raw array

**Fix:** Make formats consistent or document the difference

---

## 🟢 Minor Issues

### 6. **Missing error details in refresh**
**Location:** Line 1047

**Problem:**
```typescript
if (!response.ok) {
  throw new Error('Refresh failed') // Generic error
}
```

**Impact:**
- User doesn't know why refresh failed
- Could be API key, network, or server error

**Fix:** Parse error response and show specific error message

---

### 7. **No loading state for refresh**
**Location:** Line 1012

**Problem:**
- Refresh uses `setIsGenerating(true)` but this also shows the main generation UI
- User might think a new blog is being generated

**Impact:**
- Confusing UX - refresh looks like full generation

**Fix:** Use separate loading state for refresh

---

## 📋 Summary

| Issue | Severity | Impact |
|-------|----------|--------|
| Missing systemPrompts dependency | 🔴 Critical | Stale closures |
| Context overwrites edits | 🔴 Critical | Lost user input |
| No API key check | 🔴 Critical | Silent failures |
| State sync race condition | 🟡 Medium | Unnecessary re-renders |
| Inconsistent formats | 🟡 Medium | Potential bugs |
| Generic error messages | 🟢 Minor | Poor UX |
| No separate loading state | 🟢 Minor | Confusing UX |

---

**Total Issues Found: 7**
- 🔴 Critical: 3
- 🟡 Medium: 2  
- 🟢 Minor: 2

