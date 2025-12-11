const { chromium } = require('playwright');

async function captureLiveGeneration() {
  console.log('🎬 CAPTURING LIVE GENERATION: Blog generation already in progress!');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Go directly to blogs page since generation is already happening
    console.log('📱 Loading blogs page to capture ongoing generation...');
    await page.goto('http://localhost:3002/blogs', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Take immediate screenshot to see current state
    await page.screenshot({ 
      path: 'live-1-current-state.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot 1: Current generation state captured');
    
    // Monitor for subprocess simulation messages
    let screenshotCount = 2;
    const monitoringStartTime = Date.now();
    
    console.log('👀 Monitoring live subprocess simulation...');
    console.log('📱 Looking for stage messages and progress indicators');
    
    // Take screenshots every 10 seconds to capture different stages
    for (let i = 0; i < 20; i++) { // Monitor for 3+ minutes
      await page.waitForTimeout(10000); // Wait 10 seconds
      
      // Check if there are any loading indicators or stage messages
      const hasStageIndicator = await page.locator('text=/Stage \\d+:/').count() > 0;
      const hasLoadingIndicator = await page.locator('text=/generating|processing|loading/i').count() > 0;
      const hasProgressBar = await page.locator('[role="progressbar"]').count() > 0;
      
      console.log(`🔍 Check ${i+1}: Stage=${hasStageIndicator} Loading=${hasLoadingIndicator} Progress=${hasProgressBar}`);
      
      // Take screenshot regardless to see what's happening
      await page.screenshot({ 
        path: `live-${screenshotCount}-monitor-${i+1}.png`, 
        fullPage: true 
      });
      
      const elapsed = Math.floor((Date.now() - monitoringStartTime) / 1000);
      console.log(`✅ Screenshot ${screenshotCount}: Monitor ${i+1} at ${elapsed}s`);
      screenshotCount++;
      
      // Check if generation completed
      const hasResult = await page.locator('text=/generated|complete|success|finished/i').count() > 0;
      if (hasResult) {
        console.log('🎉 Generation appears complete!');
        await page.screenshot({ 
          path: `live-${screenshotCount}-final-result.png`, 
          fullPage: true 
        });
        console.log(`✅ Screenshot ${screenshotCount}: Final result captured`);
        break;
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Live capture failed:', error.message);
    return false;
  } finally {
    console.log('🔍 Keeping browser open for inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

console.log('🎬 STARTING LIVE GENERATION CAPTURE');
console.log('📋 A blog generation is already running in the backend!');
console.log('👀 This will capture the live subprocess simulation');
console.log('⏰ Monitoring for 3+ minutes to catch the full process');
console.log('');

captureLiveGeneration().then(success => {
  if (success) {
    console.log('\n🎯 LIVE SUBPROCESS SIMULATION CAPTURED!');
    console.log('📁 Check all live-*.png files to see the live generation process');
  } else {
    console.log('\n❌ Live capture failed');
  }
  process.exit(success ? 0 : 1);
});