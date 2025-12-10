# Em Dash Fix Status - CONFIRMED ISSUE

## 🚨 **Critical Finding:**

The blog generation **IS failing** due to em dash validation errors, despite the fix being in the code.

### Evidence from Logs:

```
[LOG] 2025-12-10 16:43:22,575 - pipeline.models.output_schema - ERROR - ❌ Em dashes found (AI marker detected)
[LOG] 2025-12-10 16:43:22,576 - pipeline.blog_generation.stage_03_extraction - WARNING - ⚠️  Validation error: 2 validation errors for ArticleOutput
```

This is the **OLD validator** behavior (raises `ValueError`).

### Code is Correct:

```python
# pipeline/models/output_schema.py (line 377)
def validate_no_em_dashes(cls, v: str) -> str:
    """AUTO-REPLACE em dashes (defense-in-depth)"""
    v = re.sub(r'—|&mdash;|&#8212;|&#x2014;', ' - ', v)
    if v != original:
        logger.warning("⚠️  Em dashes found and auto-replaced...")
    return v  # Should NOT raise ValueError
```

✅ **The code auto-replaces**, not raises error.

### Problem: Python Bytecode Cache

Despite:
1. Clearing `__pycache__` directories ✅
2. Deleting `.pyc` files ✅
3. Git submodule on correct branch (`fix/em-dash-auto-replace`) ✅
4. Latest commit (`391335f`) ✅
5. Code verified correct ✅

**Python is STILL executing old bytecode!**

### Possible Causes:

1. **System-level Python cache** (not in project directory)
2. **Import cache in Python process** (modules cached in memory)
3. **`.pyc` files outside `__pycache__`** (legacy Python 2 style)
4. **Virtual environment caching** bytecode
5. **Docker/container** using old image

### Solution Options:

#### Option 1: Force Module Reload (Recommended)
```python
import sys
import importlib

# Before generating blog
if 'pipeline.models.output_schema' in sys.modules:
    importlib.reload(sys.modules['pipeline.models.output_schema'])
```

#### Option 2: Run with `PYTHONDONTWRITEBYTECODE`
```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/generate-blog.py
```

#### Option 3: Clear System Python Cache
```bash
# macOS
sudo rm -rf ~/Library/Caches/Python*
python3 -m py_compile  # Force recompile all imports
```

#### Option 4: Use Different Python Interpreter
```bash
python3.11 scripts/generate-blog.py  # Try different Python version
```

### Impact:

-  Blog generation **fails** at Stage 3 (Extraction)
- ❌ `ValueError: Em dashes (—) are FORBIDDEN` raised
- ❌ No HTML content generated
- ❌ Process completes with "Partial recovery" but empty output

### Next Steps:

1. ✅ Implement Option 1 (force module reload) in test script
2. 🔄 Re-run blog generation test
3. ✅ Verify logs show `⚠️  Em dashes found and auto-replaced` (NEW behavior)
4. ✅ Verify HTML content generated

---

**Status**: ❌ **NOT FIXED YET** - Python cache issue blocking deployment

