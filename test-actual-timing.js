const { chromium } = require('playwright');

async function testActualTiming() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== TESTING ACTUAL KEYWORD GENERATION TIMING ===');
    
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Navigated to keywords page');
    
    // Click generate and time it
    const startTime = Date.now();
    console.log(`🚀 Starting generation at: ${new Date().toLocaleTimeString()}`);
    
    const generateButton = page.locator('button:has-text("Generate Keywords")').first();
    await generateButton.click();
    
    console.log('⏱️ Monitoring actual completion time...');
    console.log('(Will check every 10 seconds for up to 5 minutes)');
    
    let completed = false;
    let checkCount = 0;
    const maxChecks = 30; // 5 minutes / 10 seconds
    
    while (!completed && checkCount < maxChecks) {
      await page.waitForTimeout(10000); // Check every 10 seconds
      checkCount++;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`📊 Check ${checkCount}: ${elapsed}s elapsed`);
      
      // Check if results appeared (generation completed)
      const resultsTable = await page.locator('table, .results-table, text="keywords generated"').count();
      const errorMessage = await page.locator('text="error", text="failed"').count();
      const stillGenerating = await page.locator('text="Generating", text="in Progress"').count();
      
      if (resultsTable > 0) {
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ COMPLETED! Total time: ${totalTime} seconds (${Math.round(totalTime/60)}m ${totalTime%60}s)`);
        completed = true;
      } else if (errorMessage > 0) {
        const totalTime = Math.round((Date.now() - startTime) / 1000);
        console.log(`❌ FAILED! Error after: ${totalTime} seconds`);
        completed = true;
      } else if (stillGenerating > 0) {
        console.log(`⏳ Still generating...`);
      } else {
        console.log(`❓ Unknown state - checking page content`);
        // Take screenshot for debugging
        await page.screenshot({ path: `debug-timing-${checkCount}.png` });
      }
    }
    
    if (!completed) {
      console.log(`⏰ TIMEOUT: Generation took longer than 5 minutes`);
    }

  } catch (error) {
    console.error('Error testing timing:', error);
  } finally {
    await browser.close();
  }
}

testActualTiming();