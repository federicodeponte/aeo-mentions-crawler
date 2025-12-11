const { chromium } = require('playwright');

async function debugRealIssue() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== DEBUGGING REAL KEYWORDS ISSUE ===');
    
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Check localStorage state
    const storageState = await page.evaluate(() => {
      const apiKey = localStorage.getItem('gemini-api-key');
      const context = localStorage.getItem('bulk-gpt-business-context');
      
      return {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        hasContextInStorage: !!context,
        contextData: context ? JSON.parse(context) : null
      };
    });
    
    console.log('Keywords page localStorage:');
    console.log('- API Key present:', storageState.hasApiKey, `(${storageState.apiKeyLength} chars)`);
    console.log('- Context present:', storageState.hasContextInStorage);
    console.log('- Company name in context:', storageState.contextData?.companyName);
    console.log('- Company website in context:', storageState.contextData?.companyWebsite);
    
    // Check the button state using Playwright selectors
    const generateButton = page.locator('button').filter({ hasText: 'Generate Keywords' });
    const buttonExists = await generateButton.count() > 0;
    
    if (buttonExists) {
      const isDisabled = await generateButton.getAttribute('disabled');
      const buttonText = await generateButton.textContent();
      console.log('Keywords Generate button:');
      console.log('- Found:', buttonExists);
      console.log('- Disabled:', isDisabled !== null);
      console.log('- Text:', buttonText);
    } else {
      console.log('Generate Keywords button not found!');
    }
    
    // Let's also check if there are any React error boundaries or console errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Error') || msg.text().includes('DEBUG')) {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Reload to catch any errors
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check button again after reload
    const buttonAfterReload = page.locator('button').filter({ hasText: 'Generate Keywords' });
    const buttonExistsAfterReload = await buttonAfterReload.count() > 0;
    
    if (buttonExistsAfterReload) {
      const isDisabledAfterReload = await buttonAfterReload.getAttribute('disabled');
      console.log('After reload - Button disabled:', isDisabledAfterReload !== null);
    }
    
    console.log('Console errors/messages:', consoleLogs);
    
    // Now let's check the working analytics page
    console.log('\n=== CHECKING WORKING ANALYTICS PAGE ===');
    await page.goto('http://localhost:3002/analytics');
    await page.waitForLoadState('networkidle');
    
    const analyticsStorageState = await page.evaluate(() => {
      const apiKey = localStorage.getItem('gemini-api-key');
      return {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0
      };
    });
    
    const analyticsButton = page.locator('button').filter({ hasText: 'Run Full Analytics' });
    const analyticsButtonExists = await analyticsButton.count() > 0;
    
    if (analyticsButtonExists) {
      const analyticsIsDisabled = await analyticsButton.getAttribute('disabled');
      console.log('Analytics page:');
      console.log('- API Key present:', analyticsStorageState.hasApiKey, `(${analyticsStorageState.apiKeyLength} chars)`);
      console.log('- Button disabled:', analyticsIsDisabled !== null);
    }
    
    // Let's also check if there's a difference in how the useContextStorage hook behaves
    console.log('\n=== DIRECT COMPARISON ===');
    console.log('Both pages should have same API key:', 
      storageState.hasApiKey === analyticsStorageState.hasApiKey);
    console.log('Both pages have same key length:', 
      storageState.apiKeyLength === analyticsStorageState.apiKeyLength);
      
    // Let's go back to keywords and check the specific disabled condition
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Check if we can inject some debug code
    const debugResult = await page.evaluate(() => {
      // Try to find if there are any React DevTools or debug info
      const button = document.querySelector('button');
      if (button) {
        const buttonText = button.textContent;
        const isDisabled = button.hasAttribute('disabled');
        const className = button.className;
        return {
          foundButton: true,
          text: buttonText,
          disabled: isDisabled,
          className: className
        };
      }
      return { foundButton: false };
    });
    
    console.log('\n=== BUTTON DEBUG INFO ===');
    console.log(debugResult);

  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugRealIssue();