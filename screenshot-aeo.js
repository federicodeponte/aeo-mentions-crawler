const { chromium } = require('playwright');

async function takeScreenshot() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Navigating to http://localhost:3002/aeo-analytics...');
    await page.goto('http://localhost:3002/aeo-analytics', { waitUntil: 'networkidle' });
    
    // Wait a bit more for any dynamic content to load
    await page.waitForTimeout(3000);
    
    console.log('Taking screenshot...');
    await page.screenshot({ 
      path: '/Users/federicodeponte/personal-assistant/clients@scaile.tech-setup/content-manager/aeo-analytics-screenshot.png', 
      fullPage: true 
    });
    
    console.log('Screenshot saved as aeo-analytics-screenshot.png');
    
    // Also capture some text content to see what's on the page
    const title = await page.title();
    console.log('Page title:', title);
    
    // Look for key elements
    try {
      const mentionsSection = await page.textContent('body');
      console.log('Page contains mentions check results:', mentionsSection.includes('mentions'));
      console.log('Page contains query results:', mentionsSection.includes('Query Results'));
      console.log('Page contains detailed results:', mentionsSection.includes('Detailed Results'));
    } catch (e) {
      console.log('Error reading page content:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshot();