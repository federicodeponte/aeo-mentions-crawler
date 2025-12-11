const { chromium } = require('playwright');

async function debugContextComparison() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');

    console.log('=== KEYWORDS PAGE DEBUG ===');
    
    // Check localStorage for context and API key
    const keywordContext = await page.evaluate(() => {
      const context = localStorage.getItem('bulk-gpt-business-context');
      const apiKey = localStorage.getItem('gemini-api-key');
      return {
        hasContextStored: !!context,
        contextKeys: context ? Object.keys(JSON.parse(context)) : [],
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0
      };
    });
    
    console.log('Keywords Page - localStorage:', keywordContext);
    
    // Get button state
    const keywordButton = page.locator('button:has-text("Generate Keywords")');
    const isKeywordButtonDisabled = await keywordButton.getAttribute('disabled') !== null;
    const keywordButtonText = await keywordButton.textContent();
    
    console.log('Keywords Button:', {
      disabled: isKeywordButtonDisabled,
      text: keywordButtonText
    });
    
    // Take screenshot
    await page.screenshot({ path: 'keywords-debug.png' });

    // Navigate to analytics page
    await page.goto('http://localhost:3002/analytics');
    await page.waitForLoadState('networkidle');
    
    console.log('\n=== ANALYTICS PAGE DEBUG ===');
    
    // Check localStorage for context
    const analyticsContext = await page.evaluate(() => {
      const context = localStorage.getItem('bulk-gpt-business-context');
      return {
        hasContextStored: !!context,
        contextKeys: context ? Object.keys(JSON.parse(context)) : []
      };
    });
    
    console.log('Analytics Page - localStorage:', analyticsContext);
    
    // Get button state
    const analyticsButton = page.locator('button:has-text("Run Full Analytics")');
    const isAnalyticsButtonDisabled = await analyticsButton.getAttribute('disabled') !== null;
    const analyticsButtonText = await analyticsButton.textContent();
    
    console.log('Analytics Button:', {
      disabled: isAnalyticsButtonDisabled,
      text: analyticsButtonText
    });
    
    // Take screenshot  
    await page.screenshot({ path: 'analytics-debug.png' });
    
    // Summary
    console.log('\n=== COMPARISON SUMMARY ===');
    console.log(`Keywords Button Disabled: ${isKeywordButtonDisabled}`);
    console.log(`Analytics Button Disabled: ${isAnalyticsButtonDisabled}`);
    console.log(`API Key Present: ${keywordContext.hasApiKey} (length: ${keywordContext.apiKeyLength})`);

  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugContextComparison();