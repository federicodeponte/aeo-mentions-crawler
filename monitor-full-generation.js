const { chromium } = require('playwright');

async function monitorFullGeneration() {
  console.log('🎬 MONITORING COMPLETE BLOG GENERATION: Full subprocess simulation');
  console.log('⏰ This will take ~5 minutes to capture the entire process');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser to monitor progress
    slowMo: 100 // Slight delay for better visibility
  });
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Step 1: Set up business context properly
    console.log('📱 1. Setting up business context...');
    await page.goto('http://localhost:3002/context', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Find and fill URL input
    const urlInputs = await page.locator('input').all();
    console.log(`Found ${urlInputs.length} inputs on context page`);
    
    for (let i = 0; i < urlInputs.length; i++) {
      const placeholder = await urlInputs[i].getAttribute('placeholder');
      console.log(`Input ${i}: placeholder="${placeholder}"`);
      
      if (placeholder && (placeholder.toLowerCase().includes('url') || placeholder.toLowerCase().includes('website'))) {
        console.log(`✅ Found URL input at index ${i}, filling with https://scaile.tech`);
        await urlInputs[i].fill('https://scaile.tech');
        await page.waitForTimeout(1000);
        break;
      }
    }
    
    // Look for analyze button and click it
    const buttons = await page.locator('button').all();
    for (let button of buttons) {
      const text = await button.textContent();
      if (text && (text.toLowerCase().includes('analyze') || text.toLowerCase().includes('check') || text.toLowerCase().includes('submit'))) {
        const isDisabled = await button.getAttribute('disabled');
        if (isDisabled === null) {
          console.log(`✅ Clicking button: "${text}"`);
          await button.click();
          console.log('⏳ Waiting for context analysis to complete (up to 60 seconds)...');
          await page.waitForTimeout(60000); // Wait for analysis
          break;
        }
      }
    }
    
    // Step 2: Navigate to blogs and set up generation
    console.log('📱 2. Navigating to blogs page...');
    await page.goto('http://localhost:3002/blogs', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Screenshot: Initial blogs page after context setup
    await page.screenshot({ 
      path: 'full-1-blogs-with-context.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot 1: Blogs page with context set up');
    
    // Step 3: Fill keyword
    console.log('📱 3. Filling primary keyword...');
    const keywordInput = page.locator('input[placeholder*="keyword"], input[placeholder*="topic"]').first();
    if (await keywordInput.count() > 0) {
      await keywordInput.fill('AEO optimization services');
      await page.waitForTimeout(2000);
      console.log('✅ Keyword filled');
    } else {
      // Fallback: try visible inputs
      const visibleInputs = await page.locator('input:visible').all();
      if (visibleInputs.length > 0) {
        await visibleInputs[0].fill('AEO optimization services');
        await page.waitForTimeout(2000);
        console.log('✅ Keyword filled (fallback method)');
      }
    }
    
    // Screenshot: Form filled and ready
    await page.screenshot({ 
      path: 'full-2-form-ready.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot 2: Form ready for generation');
    
    // Step 4: Check generate button and start generation
    console.log('📱 4. Checking generate button status...');
    const generateButton = page.locator('button').filter({ hasText: /generate/i }).first();
    const isDisabled = await generateButton.getAttribute('disabled');
    
    if (isDisabled === null) {
      console.log('🚀 Generate button is ENABLED! Starting blog generation...');
      console.log('⏰ This will take ~5 minutes. Monitoring subprocess simulation...');
      
      // Start generation
      await generateButton.click();
      await page.waitForTimeout(2000);
      
      // Screenshot: Generation started
      await page.screenshot({ 
        path: 'full-3-generation-started.png', 
        fullPage: true 
      });
      console.log('✅ Screenshot 3: Generation started - subprocess simulation begins');
      
      // Monitor subprocess simulation stages
      let screenshotCount = 4;
      const monitoringStartTime = Date.now();
      const maxMonitoringTime = 6 * 60 * 1000; // 6 minutes max
      
      console.log('👀 Monitoring subprocess rotation every 15 seconds...');
      
      while ((Date.now() - monitoringStartTime) < maxMonitoringTime) {
        // Check if generation is still in progress
        const isGenerating = await page.locator('button').filter({ hasText: /generating|processing/i }).count() > 0;
        const hasProgressIndicator = await page.locator('text=/Stage \\d+:/').count() > 0;
        
        if (!isGenerating && !hasProgressIndicator) {
          // Check if generation completed
          const hasResult = await page.locator('text=/Generated|Complete|Success/').count() > 0;
          if (hasResult) {
            console.log('🎉 Generation completed! Taking final screenshot...');
            await page.screenshot({ 
              path: `full-${screenshotCount}-generation-complete.png`, 
              fullPage: true 
            });
            console.log(`✅ Screenshot ${screenshotCount}: Generation complete`);
            break;
          }
        }
        
        // Take screenshot of current subprocess stage
        await page.screenshot({ 
          path: `full-${screenshotCount}-stage-${Math.floor((Date.now() - monitoringStartTime) / 15000)}.png`, 
          fullPage: true 
        });
        
        const elapsed = Math.floor((Date.now() - monitoringStartTime) / 1000);
        console.log(`✅ Screenshot ${screenshotCount}: Subprocess simulation at ${elapsed}s`);
        
        screenshotCount++;
        
        // Wait 15 seconds before next screenshot
        await page.waitForTimeout(15000);
      }
      
      console.log('⏰ Monitoring complete - captured full subprocess simulation');
      
    } else {
      console.log('❌ Generate button is still disabled');
      console.log('🔍 Checking for context issues...');
      
      // Check for context warnings
      const warnings = await page.locator('text=/context|warning|error/i').all();
      for (let warning of warnings) {
        const text = await warning.textContent();
        console.log(`⚠️ Found: ${text}`);
      }
    }
    
    // Keep browser open for final inspection
    console.log('🔍 Keeping browser open for 30 seconds for final inspection...');
    await page.waitForTimeout(30000);
    
    return true;
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await browser.close();
  }
}

console.log('🎬 Starting comprehensive blog generation monitoring...');
console.log('📋 This will:');
console.log('   1. Set up business context');
console.log('   2. Fill blog generation form'); 
console.log('   3. Start generation');
console.log('   4. Monitor ALL subprocess stages');
console.log('   5. Capture screenshots every 15 seconds');
console.log('   6. Run until completion (~5 minutes)');
console.log('');

monitorFullGeneration().then(success => {
  if (success) {
    console.log('\n🎯 COMPLETE SUBPROCESS SIMULATION MONITORING FINISHED!');
    console.log('📁 Check all full-*.png files to see the complete workflow');
    console.log('🎬 You now have evidence of the full 5-minute subprocess simulation');
  } else {
    console.log('\n❌ Monitoring failed - check the logs above');
  }
  process.exit(success ? 0 : 1);
});