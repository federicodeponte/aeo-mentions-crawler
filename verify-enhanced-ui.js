const { chromium } = require('playwright');

async function verifyEnhancedUI() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Navigated to keywords page');
    
    // Just take a screenshot to verify UI
    await page.screenshot({ path: 'keywords-page-ready.png', fullPage: true });
    console.log('📸 Screenshot taken - keywords-page-ready.png');
    
    // Check if button exists
    const buttons = await page.locator('button').all();
    console.log('Found buttons:', buttons.length);
    
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      const disabled = await buttons[i].getAttribute('disabled');
      console.log(`Button ${i+1}: "${text}" (disabled: ${disabled !== null})`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

verifyEnhancedUI();