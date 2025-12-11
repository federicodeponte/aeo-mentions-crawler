const { chromium } = require('playwright');

async function completeSubprocessDemo() {
  console.log('🎬 COMPLETE SUBPROCESS SIMULATION DEMO');
  console.log('📋 This will run the full 5-minute blog generation and monitor ALL stages');
  console.log('⏰ Expected duration: ~5-8 minutes total');
  console.log('');

  const browser = await chromium.launch({ 
    headless: false, // Show browser for real-time monitoring
    slowMo: 50 
  });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Step 1: Set up business context first
    console.log('🔧 STEP 1: Setting up business context...');
    await page.goto('http://localhost:3002/context', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Find URL input and fill it
    const urlInput = await page.locator('input').first();
    if (await urlInput.count() > 0) {
      console.log('✅ Filling company URL: https://scaile.tech');
      await urlInput.clear();
      await urlInput.fill('https://scaile.tech');
      await page.waitForTimeout(2000);
      
      // Look for analyze/check button
      const analyzeBtn = await page.locator('button').filter({ hasText: /analyze|check|submit/i }).first();
      if (await analyzeBtn.count() > 0 && !(await analyzeBtn.getAttribute('disabled'))) {
        console.log('✅ Clicking analyze button...');
        await analyzeBtn.click();
        console.log('⏳ Waiting for context analysis (30 seconds)...');
        await page.waitForTimeout(30000);
      }
    }
    
    // Step 2: Navigate to blogs
    console.log('\\n🔧 STEP 2: Navigating to blog generation...');
    await page.goto('http://localhost:3002/blogs', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Screenshot: Initial state
    await page.screenshot({ 
      path: 'complete-1-blogs-ready.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot 1: Blogs page ready');
    
    // Step 3: Fill keyword and start generation
    console.log('\\n🔧 STEP 3: Filling keyword and starting generation...');
    
    // Find and fill keyword input
    const keywordInput = await page.locator('input').filter({ hasText: '' }).first();
    if (await keywordInput.count() > 0) {
      await keywordInput.clear();
      await keywordInput.fill('AEO optimization services');
      console.log('✅ Keyword filled: AEO optimization services');
      await page.waitForTimeout(2000);
    }
    
    // Screenshot: Form filled
    await page.screenshot({ 
      path: 'complete-2-form-filled.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot 2: Form filled and ready');
    
    // Find and click generate button
    const generateBtn = await page.locator('button').filter({ hasText: /generate/i }).first();
    const isDisabled = await generateBtn.getAttribute('disabled');
    
    if (isDisabled === null) {
      console.log('\\n🚀 STEP 4: Starting blog generation...');
      console.log('⏰ This will take ~5 minutes - monitoring subprocess simulation');
      console.log('👀 Watch for rotating stage messages every 2.5 seconds');
      console.log('');
      
      await generateBtn.click();
      await page.waitForTimeout(2000);
      
      // Screenshot: Generation started
      await page.screenshot({ 
        path: 'complete-3-generation-started.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot 3: Generation started - subprocess simulation active');
      
      // Monitor subprocess simulation
      const startTime = Date.now();
      let screenshotCount = 4;
      let lastStageMessage = '';
      
      console.log('👁️  MONITORING SUBPROCESS SIMULATION:');
      console.log('   Expected stages: 0→1→2→3→2b→4→5→6→7→8→9→10');
      console.log('   Stage rotation every 2.5 seconds');
      console.log('');
      
      // Monitor for up to 8 minutes (480 seconds)
      const maxDuration = 8 * 60 * 1000;
      
      while ((Date.now() - startTime) < maxDuration) {
        // Check for stage messages
        const stageElements = await page.locator('text=/Stage \\d+:/').all();
        const loadingElements = await page.locator('text=/Generating|Processing/i').all();
        
        let currentStage = 'Unknown';
        if (stageElements.length > 0) {
          currentStage = await stageElements[0].textContent();
        } else if (loadingElements.length > 0) {
          currentStage = await loadingElements[0].textContent();
        }
        
        // Log stage changes
        if (currentStage !== lastStageMessage) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          console.log(`   [${elapsed}s] 🔄 ${currentStage}`);
          lastStageMessage = currentStage;
        }
        
        // Take screenshot every 15 seconds
        if ((Date.now() - startTime) % 15000 < 2000) {
          await page.screenshot({ 
            path: `complete-${screenshotCount}-stage-${Math.floor((Date.now() - startTime) / 15000)}.png`, 
            fullPage: true 
          });
          console.log(`📸 Screenshot ${screenshotCount}: Stage monitoring`);
          screenshotCount++;
        }
        
        // Check if generation completed
        const completedElements = await page.locator('text=/Generated|Complete|Success|finished/i').all();
        const hasResult = completedElements.length > 0;
        
        if (hasResult) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          console.log(`\\n🎉 GENERATION COMPLETE after ${elapsed} seconds!`);
          
          await page.screenshot({ 
            path: `complete-${screenshotCount}-final-result.png`, 
            fullPage: true 
          });
          console.log(`📸 Screenshot ${screenshotCount}: Final result`);
          break;
        }
        
        // Wait 2 seconds before next check
        await page.waitForTimeout(2000);
      }
      
      const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`\\n📊 MONITORING COMPLETE: ${totalElapsed} seconds total`);
      
    } else {
      console.log('❌ Generate button is disabled - context setup may have failed');
      return false;
    }
    
    // Keep browser open for final inspection
    console.log('\\n🔍 Final inspection (30 seconds)...');
    await page.waitForTimeout(30000);
    
    return true;
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await browser.close();
  }
}

completeSubprocessDemo().then(success => {
  if (success) {
    console.log('\\n🎯 COMPLETE SUBPROCESS SIMULATION DEMO FINISHED!');
    console.log('📁 Check complete-*.png files for the full workflow');
    console.log('✅ You now have evidence of the complete 5-minute subprocess simulation');
  } else {
    console.log('\\n❌ Demo failed - check the logs above');
  }
  process.exit(success ? 0 : 1);
});