const { chromium } = require('playwright');

async function testAnalyticsWithoutKey() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== TESTING ANALYTICS WITHOUT CLIENT-SIDE API KEY ===');
    
    // Navigate to analytics page
    await page.goto('http://localhost:3002/analytics');
    await page.waitForLoadState('networkidle');
    
    // Confirm no API key in localStorage
    const hasApiKey = await page.evaluate(() => {
      return !!localStorage.getItem('gemini-api-key');
    });
    
    console.log('Client-side API key present:', hasApiKey);
    
    // Try to click the "Run Full Analytics" button
    const analyticsButton = page.locator('button').filter({ hasText: 'Run Full Analytics' });
    const isDisabled = await analyticsButton.getAttribute('disabled');
    
    console.log('Analytics button disabled:', isDisabled !== null);
    
    if (isDisabled === null) {
      console.log('Attempting to click Analytics button...');
      
      // Monitor network requests to see what happens
      const requests = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          requests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData()
          });
        }
      });
      
      // Monitor console for errors
      const consoleLogs = [];
      page.on('console', msg => {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      });
      
      // Click the button
      await analyticsButton.click();
      
      // Wait a moment for any immediate response
      await page.waitForTimeout(3000);
      
      console.log('Network requests made:');
      requests.forEach(req => {
        console.log(`- ${req.method} ${req.url}`);
      });
      
      console.log('Console messages:');
      consoleLogs.slice(-10).forEach(log => { // Last 10 messages
        if (log.includes('Error') || log.includes('ANALYTICS') || log.includes('API')) {
          console.log(`- ${log}`);
        }
      });
      
      // Check if the loading state started
      const isLoading = await page.locator('text=Running Analytics').count() > 0;
      console.log('Analytics started loading:', isLoading);
      
    } else {
      console.log('Analytics button is disabled - cannot test');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'analytics-without-key-test.png' });

  } catch (error) {
    console.error('Error testing analytics:', error);
  } finally {
    await browser.close();
  }
}

testAnalyticsWithoutKey();