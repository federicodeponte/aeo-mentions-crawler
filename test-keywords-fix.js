const { chromium } = require('playwright');

async function testKeywordsFix() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== TESTING KEYWORDS FIX ===');
    
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Check button state
    const generateButton = page.locator('button').filter({ hasText: 'Generate Keywords' });
    const isDisabled = await generateButton.getAttribute('disabled');
    
    console.log('Keywords Generate button disabled:', isDisabled !== null);
    
    // Check localStorage state (should still be empty)
    const storageState = await page.evaluate(() => {
      const apiKey = localStorage.getItem('gemini-api-key');
      const context = localStorage.getItem('bulk-gpt-business-context');
      return {
        hasApiKey: !!apiKey,
        hasContext: !!context
      };
    });
    
    console.log('Storage state:', storageState);
    
    if (isDisabled === null) {
      console.log('✅ SUCCESS: Keywords button is now ENABLED!');
      
      // Test if it actually works by attempting to click
      console.log('Testing click...');
      
      // Monitor network requests
      const requests = [];
      page.on('request', request => {
        if (request.url().includes('/api/generate-keywords')) {
          requests.push({
            url: request.url(),
            method: request.method(),
            hasApiKey: request.postData()?.includes('apiKey')
          });
        }
      });
      
      // Monitor console logs
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.text().includes('KEYWORDS')) {
          consoleLogs.push(msg.text());
        }
      });
      
      await generateButton.click();
      await page.waitForTimeout(2000); // Wait for request
      
      console.log('Network requests to keywords API:', requests);
      console.log('Console logs:', consoleLogs);
      
      // Check if loading state started
      const isLoading = await page.locator('text=Generating').count() > 0;
      console.log('Keywords generation started:', isLoading);
      
    } else {
      console.log('❌ FAILED: Keywords button is still disabled');
      console.log('Need to check what else might be causing the issue...');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'keywords-after-fix.png' });

  } catch (error) {
    console.error('Error testing fix:', error);
  } finally {
    await browser.close();
  }
}

testKeywordsFix();