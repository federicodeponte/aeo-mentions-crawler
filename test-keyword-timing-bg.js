// Background timing test - will run and exit
const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    console.log('🚀 [BACKGROUND] Starting keyword timing test...');
    
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Quick check if server is running
    try {
      await page.goto('http://localhost:3002/keywords', { timeout: 5000 });
    } catch {
      console.log('❌ [BACKGROUND] Server not running on :3002');
      return;
    }
    
    const startTime = Date.now();
    console.log('⏱️ [BACKGROUND] Test started:', new Date().toLocaleTimeString());
    
    // Click generate button
    const button = await page.locator('button:has-text("Generate Keywords")').first();
    await button.click();
    
    // Monitor until completion (max 10 minutes)
    let completed = false;
    let lastCheck = startTime;
    
    while (!completed && (Date.now() - startTime) < 600000) {
      await new Promise(resolve => setTimeout(resolve, 15000)); // Check every 15s
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      // Check for completion indicators
      const hasResults = await page.locator('table, .results-table, [data-testid="results"]').count();
      const hasError = await page.locator('text="Failed", text="Error", text="error"').count();
      const isStillGenerating = await page.locator('text="Generating", text="Progress"').count();
      
      if (hasResults > 0) {
        console.log(`✅ [BACKGROUND] COMPLETED in ${elapsed}s (${Math.round(elapsed/60)}m ${elapsed%60}s)`);
        completed = true;
      } else if (hasError > 0) {
        console.log(`❌ [BACKGROUND] FAILED after ${elapsed}s`);
        completed = true;
      } else if (elapsed % 30 === 0) { // Log every 30s
        console.log(`⏳ [BACKGROUND] Still running... ${elapsed}s elapsed`);
      }
    }
    
    if (!completed) {
      console.log(`⏰ [BACKGROUND] TIMEOUT after 10 minutes`);
    }
    
  } catch (error) {
    console.log('❌ [BACKGROUND] Error:', error.message);
  } finally {
    if (browser) await browser.close();
    console.log('🏁 [BACKGROUND] Test finished');
  }
})();