const { chromium } = require('playwright');

async function checkApiKeyEverywhere() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== CHECKING API KEY ACROSS ALL PAGES ===');
    
    const pages = [
      { name: 'Keywords', url: 'http://localhost:3002/keywords' },
      { name: 'Analytics', url: 'http://localhost:3002/analytics' },
      { name: 'Context', url: 'http://localhost:3002/context' },
      { name: 'Settings', url: 'http://localhost:3002/settings' }
    ];
    
    for (const pageInfo of pages) {
      console.log(`\n=== ${pageInfo.name.toUpperCase()} PAGE ===`);
      
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      const apiKeyState = await page.evaluate(() => {
        const key = localStorage.getItem('gemini-api-key');
        return {
          hasKey: !!key,
          keyLength: key ? key.length : 0,
          keyPreview: key ? key.substring(0, 10) + '...' : 'null'
        };
      });
      
      console.log(`${pageInfo.name} - API Key:`, apiKeyState);
      
      // Check if there are any buttons that might indicate working/not working
      const buttons = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        return allButtons.map(btn => ({
          text: btn.textContent.trim().substring(0, 30),
          disabled: btn.disabled || btn.hasAttribute('disabled')
        }));
      });
      
      console.log(`${pageInfo.name} - Buttons:`, buttons);
      
      // Special check for settings page
      if (pageInfo.name === 'Settings') {
        const settingsInfo = await page.evaluate(() => {
          const geminiInput = document.querySelector('input[id="gemini-api-key"]');
          const openrouterInput = document.querySelector('input[id="openrouter-api-key"]');
          
          return {
            geminiInputExists: !!geminiInput,
            geminiInputValue: geminiInput ? (geminiInput.value ? 'HAS_VALUE' : 'EMPTY') : 'NOT_FOUND',
            openrouterInputExists: !!openrouterInput,
            openrouterInputValue: openrouterInput ? (openrouterInput.value ? 'HAS_VALUE' : 'EMPTY') : 'NOT_FOUND'
          };
        });
        
        console.log(`${pageInfo.name} - Input fields:`, settingsInfo);
      }
    }
    
    // Final check: Let's see if we can find where the API key should be set
    console.log('\n=== MANUAL API KEY CHECK ===');
    await page.goto('http://localhost:3002/settings');
    await page.waitForLoadState('networkidle');
    
    // Check if API key is visible in the input field
    const geminiInput = page.locator('input[id="gemini-api-key"]');
    const currentInputValue = await geminiInput.inputValue();
    
    console.log('Current Gemini input value length:', currentInputValue.length);
    
    if (currentInputValue.length === 0) {
      console.log('\n🔍 The API key input is EMPTY in settings!');
      console.log('This explains why the Keywords button is disabled.');
      console.log('\nTo fix this:');
      console.log('1. Enter a Gemini API key in the settings');
      console.log('2. Click Save');
      console.log('3. The Keywords button should then work');
    } else {
      console.log('\n✅ API key is present in settings input field');
      console.log('There might be a different issue...');
    }

  } catch (error) {
    console.error('Error checking API keys:', error);
  } finally {
    await browser.close();
  }
}

checkApiKeyEverywhere();