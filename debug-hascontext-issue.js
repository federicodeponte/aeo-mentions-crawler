const { chromium } = require('playwright');

async function debugHasContextIssue() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== DEBUGGING hasContext ISSUE ===');
    
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Inject some debug code to check the hasContext logic
    const hasContextDebug = await page.evaluate(() => {
      const contextString = localStorage.getItem('bulk-gpt-business-context');
      if (!contextString) return { error: 'No context in storage' };
      
      const businessContext = JSON.parse(contextString);
      
      // Replicate the hasContext logic from useContextStorage.ts
      const hasContext = Object.keys(businessContext).some(key => {
        const value = businessContext[key];
        return value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
      });
      
      // Let's also check each key individually
      const keyAnalysis = {};
      Object.keys(businessContext).forEach(key => {
        const value = businessContext[key];
        const isValid = value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
        keyAnalysis[key] = {
          value: Array.isArray(value) ? `[Array with ${value.length} items]` : value,
          type: typeof value,
          isValid: isValid
        };
      });
      
      return {
        hasContext,
        totalKeys: Object.keys(businessContext).length,
        keyAnalysis,
        businessContext: businessContext
      };
    });
    
    console.log('hasContext debug result:');
    console.log('- hasContext should be:', hasContextDebug.hasContext);
    console.log('- Total keys:', hasContextDebug.totalKeys);
    console.log('- Key analysis:');
    Object.entries(hasContextDebug.keyAnalysis).forEach(([key, analysis]) => {
      console.log(`  ${key}: ${analysis.isValid ? '✓' : '✗'} (${analysis.type}) = ${analysis.value}`);
    });
    
    // Now let's check if there's something wrong with the React component state
    // Let's try to access the React DevTools or add some debug logs
    
    // Try to trigger a re-render or check component state
    await page.addInitScript(() => {
      // Hook into React to debug the component
      window.reactDebug = {
        hasContextCalls: [],
        geminiApiKeyCalls: []
      };
      
      // Override localStorage.getItem to track calls
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = function(key) {
        const result = originalGetItem.call(this, key);
        if (key === 'gemini-api-key') {
          window.reactDebug.geminiApiKeyCalls.push({ key, result: !!result });
        } else if (key === 'bulk-gpt-business-context') {
          window.reactDebug.hasContextCalls.push({ key, result: !!result });
        }
        return result;
      };
    });
    
    // Reload to catch the initialization
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check the debug tracking
    const reactDebugInfo = await page.evaluate(() => window.reactDebug || {});
    console.log('\nReact debug tracking:');
    console.log('- Gemini API key calls:', reactDebugInfo.geminiApiKeyCalls || []);
    console.log('- Context calls:', reactDebugInfo.hasContextCalls || []);
    
    // Let's also manually check the button state by looking at its properties
    const buttonDebug = await page.evaluate(() => {
      // Find all buttons and analyze them
      const buttons = Array.from(document.querySelectorAll('button'));
      const generateButton = buttons.find(btn => btn.textContent.includes('Generate Keywords'));
      
      if (generateButton) {
        return {
          found: true,
          disabled: generateButton.disabled,
          hasDisabledAttribute: generateButton.hasAttribute('disabled'),
          ariaDisabled: generateButton.getAttribute('aria-disabled'),
          innerHTML: generateButton.innerHTML,
          outerHTML: generateButton.outerHTML.substring(0, 200) // First 200 chars
        };
      }
      
      return { found: false, allButtons: buttons.map(btn => btn.textContent.substring(0, 50)) };
    });
    
    console.log('\nButton properties:');
    console.log(buttonDebug);
    
    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'hascontext-debug.png', fullPage: true });

  } catch (error) {
    console.error('Error during hasContext debugging:', error);
  } finally {
    await browser.close();
  }
}

debugHasContextIssue();