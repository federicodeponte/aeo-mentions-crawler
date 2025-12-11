const { chromium } = require('playwright');

async function checkApiKeyState() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Go to settings page first to check if it's accessible
    await page.goto('http://localhost:3002/settings');
    await page.waitForLoadState('networkidle');

    console.log('=== SETTINGS PAGE ===');
    
    // Check if API key input exists
    const geminiInput = page.locator('input[placeholder*="Gemini API Key"]');
    const hasGeminiInput = await geminiInput.count() > 0;
    
    console.log('Gemini API Key input present:', hasGeminiInput);
    
    if (hasGeminiInput) {
      const inputValue = await geminiInput.inputValue();
      console.log('Current input value:', inputValue ? '[HIDDEN]' : '[EMPTY]');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'settings-page.png' });

    // Now test what happens when we set an API key
    console.log('\n=== TESTING API KEY ENTRY ===');
    
    if (hasGeminiInput) {
      // Clear and enter a test API key
      await geminiInput.fill('TEST_API_KEY_FOR_DEBUGGING');
      
      // Save the key
      const saveButton = page.locator('button:has-text("Save API Keys")');
      await saveButton.click();
      
      // Wait for save completion
      await page.waitForTimeout(1000);
      
      console.log('API key entered and saved');
    }

    // Now navigate to keywords page to test if button is enabled
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');

    console.log('\n=== KEYWORDS PAGE AFTER API KEY ENTRY ===');
    
    // Check button state
    const keywordButton = page.locator('button:has-text("Generate Keywords")');
    const isDisabled = await keywordButton.getAttribute('disabled') !== null;
    
    console.log('Keywords Button Disabled:', isDisabled);
    
    // Check localStorage for API key
    const hasApiKeyNow = await page.evaluate(() => {
      const key = localStorage.getItem('gemini-api-key');
      return { hasKey: !!key, keyLength: key ? key.length : 0 };
    });
    
    console.log('API Key in localStorage:', hasApiKeyNow);
    
    // Take screenshot
    await page.screenshot({ path: 'keywords-after-api-key.png' });

  } catch (error) {
    console.error('Error during API key testing:', error);
  } finally {
    await browser.close();
  }
}

checkApiKeyState();