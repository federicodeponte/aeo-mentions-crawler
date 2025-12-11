const { chromium } = require('playwright');

async function checkCurrentState() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Check settings page first
    console.log('=== CHECKING SETTINGS PAGE ===');
    await page.goto('http://localhost:3002/settings');
    await page.waitForLoadState('networkidle');
    
    // Check if there's already an API key in the input
    const geminiInput = page.locator('input[id="gemini-api-key"]');
    const currentValue = await geminiInput.inputValue();
    console.log('Current Gemini API Key in settings:', currentValue ? `[SET - ${currentValue.length} characters]` : '[EMPTY]');
    
    // Take screenshot of settings
    await page.screenshot({ path: 'current-settings.png' });
    
    // Check keywords page
    console.log('\n=== CHECKING KEYWORDS PAGE ===');
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Check localStorage directly
    const storageState = await page.evaluate(() => {
      return {
        geminiKey: localStorage.getItem('gemini-api-key'),
        contextData: localStorage.getItem('bulk-gpt-business-context')
      };
    });
    
    console.log('LocalStorage state:');
    console.log('- Gemini API Key:', storageState.geminiKey ? `[SET - ${storageState.geminiKey.length} chars]` : '[MISSING]');
    console.log('- Context Data:', storageState.contextData ? '[PRESENT]' : '[MISSING]');
    
    // Check button state
    const generateButton = page.locator('button:has-text("Generate Keywords")');
    const isDisabled = await generateButton.getAttribute('disabled') !== null;
    console.log('- Generate Button Disabled:', isDisabled);
    
    // Check if there's any warning message about missing API key
    const warningMessage = await page.locator('text*="API key"').count();
    console.log('- API key warning messages found:', warningMessage);
    
    // Take screenshot of keywords page
    await page.screenshot({ path: 'current-keywords.png' });
    
    // Look for any error or warning indicators
    const contextIndicator = await page.locator('text*="Using Company Context"').count();
    const noContextWarning = await page.locator('text*="No Company Context"').count();
    console.log('- "Using Company Context" messages:', contextIndicator);
    console.log('- "No Company Context" warnings:', noContextWarning);

  } catch (error) {
    console.error('Error checking current state:', error);
  } finally {
    await browser.close();
  }
}

checkCurrentState();