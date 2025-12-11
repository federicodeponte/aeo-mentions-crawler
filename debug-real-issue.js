const { chromium } = require('playwright');

async function debugRealIssue() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== DEBUGGING REAL KEYWORDS ISSUE ===');
    
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Check all the disabled conditions in real-time
    const debugInfo = await page.evaluate(() => {
      // Check localStorage
      const apiKey = localStorage.getItem('gemini-api-key');
      const context = localStorage.getItem('bulk-gpt-business-context');
      
      // Try to access the React state (might not work, but worth trying)
      const generateButton = document.querySelector('button:has-text("Generate Keywords")') || 
                           document.querySelector('button[disabled]') ||
                           document.querySelector('button');
      
      return {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        hasContextInStorage: !!context,
        contextKeys: context ? Object.keys(JSON.parse(context)) : [],
        buttonFound: !!generateButton,
        buttonDisabled: generateButton ? generateButton.hasAttribute('disabled') : 'not found',
        buttonText: generateButton ? generateButton.textContent : 'not found'
      };
    });
    
    console.log('Debug info:', debugInfo);
    
    // Now check if we can access the React component state
    // Let's look for the specific disabled conditions by inspecting the console
    await page.addInitScript(() => {
      // Override console.log to capture debug messages
      const originalLog = console.log;
      window.debugLogs = [];
      console.log = function(...args) {
        window.debugLogs.push(args.join(' '));
        originalLog.apply(console, args);
      };
    });
    
    // Reload to catch any debug logs
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Look for the specific disabled conditions mentioned in the code
    const buttonLocator = page.locator('button:has-text("Generate Keywords")');
    
    // Check if we can see the actual disabled attribute
    const isDisabled = await buttonLocator.getAttribute('disabled');
    console.log('Button disabled attribute:', isDisabled);
    
    // Let's check the component's console output
    const debugLogs = await page.evaluate(() => window.debugLogs || []);
    console.log('Component debug logs:', debugLogs.filter(log => 
      log.includes('DEBUG') || log.includes('hasContext') || log.includes('gemini')
    ));
    
    // Take a screenshot to see the current state
    await page.screenshot({ path: 'debug-keywords-real.png' });
    
    // Let's also check what happens on the context/analyze page that works
    console.log('\n=== CHECKING WORKING CONTEXT PAGE ===');
    await page.goto('http://localhost:3002/context');
    await page.waitForLoadState('networkidle');
    
    const contextPageInfo = await page.evaluate(() => {
      const apiKey = localStorage.getItem('gemini-api-key');
      const analyzeButton = document.querySelector('button:has-text("Analyze")') ||
                           document.querySelector('button:has-text("analyze")') ||
                           document.querySelector('button[type="submit"]');
      
      return {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        analyzeButtonFound: !!analyzeButton,
        analyzeButtonDisabled: analyzeButton ? analyzeButton.hasAttribute('disabled') : 'not found',
        analyzeButtonText: analyzeButton ? analyzeButton.textContent : 'not found'
      };
    });
    
    console.log('Context page info:', contextPageInfo);
    
    // Compare the two pages
    console.log('\n=== COMPARISON ===');
    console.log('Keywords API key:', debugInfo.hasApiKey, `(${debugInfo.apiKeyLength} chars)`);
    console.log('Context API key:', contextPageInfo.hasApiKey, `(${contextPageInfo.apiKeyLength} chars)`);
    console.log('Keywords button disabled:', debugInfo.buttonDisabled);
    console.log('Context button disabled:', contextPageInfo.analyzeButtonDisabled);

  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugRealIssue();