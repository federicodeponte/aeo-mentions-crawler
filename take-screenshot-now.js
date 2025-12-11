const { chromium } = require('playwright');

async function takeScreenshotNow() {
  console.log('📸 Taking screenshot of current state...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'current-state.png', 
      fullPage: true 
    });
    
    console.log('✅ Screenshot saved as current-state.png');
    
    // Check what's actually visible
    const isGenerating = await page.locator('text=Generating').count();
    const hasStageText = await page.locator('text=/Stage \\d+:/', { timeout: 1000 }).count().catch(() => 0);
    const hasProgress = await page.locator('.bg-primary', { timeout: 1000 }).count().catch(() => 0);
    
    console.log(`🔍 Current state:`);
    console.log(`   - "Generating" visible: ${isGenerating > 0}`);
    console.log(`   - Stage text visible: ${hasStageText > 0}`);
    console.log(`   - Progress bar visible: ${hasProgress > 0}`);
    
    if (hasStageText > 0) {
      try {
        const stageText = await page.locator('text=/Stage \\d+:/').first().textContent();
        console.log(`   - Current stage: "${stageText}"`);
      } catch (e) {
        console.log(`   - Could not read stage text`);
      }
    }
    
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
  } finally {
    await browser.close();
  }
}

takeScreenshotNow();