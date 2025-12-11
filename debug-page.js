const { chromium } = require('playwright');

async function debugPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('📍 Navigating to http://localhost:3002/blogs');
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'debug-page.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-page.png');
    
    // List all input elements
    console.log('📝 Finding all inputs...');
    const inputs = await page.locator('input').all();
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const className = await input.getAttribute('class');
      console.log(`Input ${i}: id="${id}" type="${type}" placeholder="${placeholder}"`);
    }
    
    // Check if keyword input exists
    const keywordExists = await page.locator('input#keyword').count();
    console.log(`🔍 Keyword input exists: ${keywordExists > 0}`);
    
    // Wait a bit to see the page
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugPage();