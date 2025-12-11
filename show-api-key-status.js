const { chromium } = require('playwright');

async function showApiKeyStatus() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== API KEY STATUS CHECK ===');
    
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Check if there's any message about API key requirement
    const pageText = await page.textContent('body');
    const hasApiKeyMention = pageText.includes('API key') || pageText.includes('Gemini');
    
    console.log('Keywords page mentions API key:', hasApiKeyMention);
    
    // Check button tooltip or disabled reason
    const generateButton = page.locator('button:has-text("Generate Keywords")');
    const buttonTitle = await generateButton.getAttribute('title');
    const buttonDisabled = await generateButton.getAttribute('disabled');
    
    console.log('Generate button:');
    console.log('- Disabled:', buttonDisabled !== null);
    console.log('- Title/tooltip:', buttonTitle || 'None');
    
    // Check if there's a link to settings
    const settingsLinks = await page.locator('a[href*="settings"], a:has-text("Settings")').count();
    console.log('- Settings links found:', settingsLinks);
    
    // Take final screenshot
    await page.screenshot({ path: 'api-key-status.png', fullPage: true });
    
    console.log('\n=== SOLUTION ===');
    console.log('To enable the Keywords Generate button:');
    console.log('1. Navigate to http://localhost:3002/settings');
    console.log('2. Enter your Gemini API key (get one from https://aistudio.google.com/app/apikey)');
    console.log('3. Click "Save API Keys"');
    console.log('4. Return to the Keywords page - the button will be enabled');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

showApiKeyStatus();