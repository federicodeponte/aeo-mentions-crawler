# CRITICAL ISSUE: Em Dash Fix Not Being Applied

**Status**: ❌ **BLOCKED** - Python is loading old cached code despite all fixes

---

## 🔍 **Problem:**

The em dash validation fix has been applied to the source code, but Python continues to execute the OLD validation logic that raises `ValueError`.

---

## ✅ **Confirmed Facts:**

1. **Fix is in the code** (`c62253d`):
   ```python
   # CURRENT CODE (correct)
   v = re.sub(r'—|&mdash;|&#8212;|&#x2014;', ' - ', v)
   if v != original:
       logger.warning(f"⚠️  Em dashes found and auto-replaced...")
   return v
   ```

2. **Test logs show OLD error**:
   ```
   ERROR - ❌ Em dashes found (AI marker detected)
   ValueError: Em dashes (—) are FORBIDDEN
   ```

3. **Fresh Python process loads correct code**:
   ```bash
   python3 -c "import inspect; ..." 
   → ✅ NEW CODE IS LOADED
   ```

4. **Test process loads OLD code**:
   ```bash
   nohup python3 test_full_no_timeout.py
   → ❌ OLD CODE EXECUTES
   ```

---

## 🧪 **Tests Performed:**

| Action | Result |
|--------|--------|
| Clear `__pycache__` directories | ❌ Didn't help |
| Delete `.pyc` files | ❌ Didn't help |
| Aggressive find + delete all caches | ❌ Didn't help |
| Fresh Python interpreter test | ✅ Loads new code |
| Background test process | ❌ Loads old code |

---

## 💡 **Hypothesis:**

Python's import system is caching the module in memory across test runs, OR there's a system-wide bytecode cache that `find` isn't finding.

---

## 🔧 **Next Steps:**

### Option 1: Force Module Reload in Test Script

Modify `test_full_no_timeout.py` to force reimport:

```python
import sys
import importlib

# Before importing blog-writer
if 'pipeline.models.output_schema' in sys.modules:
    importlib.reload(sys.modules['pipeline.models.output_schema'])
```

### Option 2: Use PYTHONDONTWRITEBYTECODE

Run test with bytecode generation disabled:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 test_full_no_timeout.py
```

### Option 3: Restart System Python Cache

```bash
# macOS specific
sudo rm -rf /Library/Caches/com.apple.python*
sudo rm -rf ~/Library/Caches/Python*
```

### Option 4: Use Different Python

```bash
python3.11 test_full_no_timeout.py  # Try different version
```

---

## ⏱️ **Time Spent:**

- 3 test runs (7min, 8min, 33min) = 48 minutes
- All failed with same em dash error
- Despite fix being in code for 2+ hours

---

## 🎯 **Required Outcome:**

Test logs must show:
```
⚠️  Em dashes found and auto-replaced in: ...
✅ Validation passed (with auto-corrections)
   HTML rendered (XXXXX bytes)
```

NOT:
```
❌ Em dashes found (AI marker detected)
ValueError: Em dashes (—) are FORBIDDEN
```

