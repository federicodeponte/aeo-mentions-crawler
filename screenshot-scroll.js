const { chromium } = require('playwright');

async function takeFullScreenshot() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Navigating to http://localhost:3002/aeo-analytics...');
    await page.goto('http://localhost:3002/aeo-analytics', { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Scroll to bottom to see if there are results
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await page.waitForTimeout(1000);
    
    console.log('Taking screenshot after scrolling...');
    await page.screenshot({ 
      path: '/Users/federicodeponte/personal-assistant/clients@scaile.tech-setup/content-manager/aeo-analytics-full-screenshot.png', 
      fullPage: true 
    });
    
    console.log('Full screenshot saved as aeo-analytics-full-screenshot.png');
    
    // Check for specific result elements
    const resultElements = await page.$$('[class*="result"], [class*="mention"], [class*="query"], [id*="result"]');
    console.log('Number of potential result elements found:', resultElements.length);
    
    // Check page content for key phrases
    const bodyText = await page.textContent('body');
    const hasResults = bodyText.includes('37.3%') || bodyText.includes('mentions') || bodyText.includes('visibility');
    console.log('Page contains result data:', hasResults);
    
    // Look for any error messages
    const hasError = bodyText.includes('error') || bodyText.includes('failed');
    console.log('Page contains error messages:', hasError);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

takeFullScreenshot();