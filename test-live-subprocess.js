const { chromium } = require('playwright');

async function showLiveSubprocessSimulation() {
  console.log('🚀 Starting live subprocess simulation demo...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to blogs page
    console.log('📍 Navigating to http://localhost:3002/blogs');
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Fill in the keyword
    console.log('✏️ Filling in keyword "test subprocess"...');
    await page.locator('input#keyword').fill('test subprocess');
    
    // Click generate button
    console.log('🔘 Clicking Generate Blog Article button...');
    await page.locator('button:has-text("Generate Blog Article")').click();
    
    console.log('⏳ Subprocess simulation should now be visible!');
    console.log('🎬 Watch for rotating stages every 2.5 seconds...');
    
    // Monitor and report stages for 60 seconds
    const stages = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < 60000) {
      try {
        // Look for the stage text
        const stageElement = await page.locator('text=/Stage \\d+:/).first();
        const stageText = await stageElement.textContent({ timeout: 1000 });
        
        if (stageText && !stages.includes(stageText.replace(/\.+$/, ''))) {
          const cleanStage = stageText.replace(/\.+$/, '');
          stages.push(cleanStage);
          console.log(`📋 VISIBLE: ${cleanStage}`);
        }
        
        // Check progress bar
        const progressExists = await page.locator('.bg-primary').count();
        if (progressExists > 0) {
          console.log('   ✅ Progress bar is animating');
        }
        
        await page.waitForTimeout(1000);
      } catch (e) {
        // Stage might be changing, continue
        await page.waitForTimeout(500);
      }
    }
    
    console.log(`🎉 Demo complete! Captured ${stages.length} different stages.`);
    console.log('🔍 Leave browser open to continue watching...');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(300000); // Wait 5 minutes
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('📸 Taking screenshot for debugging...');
    await page.screenshot({ path: 'subprocess-debug.png', fullPage: true });
    console.log('💾 Screenshot saved as subprocess-debug.png');
  } finally {
    await browser.close();
  }
}

showLiveSubprocessSimulation().catch(console.error);