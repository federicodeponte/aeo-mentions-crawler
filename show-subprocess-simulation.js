const { chromium } = require('playwright');

async function showSubprocessSimulation() {
  console.log('📸 DEMONSTRATING SUBPROCESS SIMULATION: Blog generation workflow');
  
  const browser = await chromium.launch({ headless: false }); // Show browser for demo
  const page = await browser.newPage();
  
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Step 1: Set up business context first
    console.log('📱 1. Setting up business context at /context');
    await page.goto('http://localhost:3002/context', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Look for URL input and fill it
    const urlInput = page.locator('input[placeholder*="URL"], input[placeholder*="website"]').first();
    if (await urlInput.count() > 0) {
      console.log('✅ Found URL input, filling with SCAILE website');
      await urlInput.fill('https://scaile.tech');
      await page.waitForTimeout(1000);
      
      // Look for analyze button
      const analyzeButton = page.locator('button').filter({ hasText: /analyze|check|submit/i }).first();
      if (await analyzeButton.count() > 0 && !(await analyzeButton.getAttribute('disabled'))) {
        console.log('✅ Clicking analyze button to set up context');
        await analyzeButton.click();
        await page.waitForTimeout(5000); // Wait for analysis
      }
    }
    
    // Step 2: Go to blogs page
    console.log('📱 2. Navigating to blogs page');
    await page.goto('http://localhost:3002/blogs', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Screenshot: Initial blogs page
    await page.screenshot({ 
      path: 'demo-1-blogs-page.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot: Blogs page loaded');
    
    // Step 3: Fill keyword
    console.log('📱 3. Filling primary keyword');
    const keywordInput = page.locator('input[placeholder*="keyword"]').first();
    if (await keywordInput.count() > 0) {
      await keywordInput.fill('AEO optimization services');
      await page.waitForTimeout(1000);
      console.log('✅ Keyword filled');
    }
    
    // Screenshot: Form filled
    await page.screenshot({ 
      path: 'demo-2-form-filled.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot: Form filled with keyword');
    
    // Step 4: Check if generate button is enabled
    const generateButton = page.locator('button').filter({ hasText: /generate/i }).first();
    const isDisabled = await generateButton.getAttribute('disabled');
    
    if (isDisabled === null) {
      console.log('📱 4. Generate button is enabled! Clicking to start generation...');
      await generateButton.click();
      await page.waitForTimeout(2000);
      
      // Screenshot: Generation started - should show subprocess simulation
      await page.screenshot({ 
        path: 'demo-3-generation-started.png', 
        fullPage: true 
      });
      console.log('✅ Screenshot: Generation started - subprocess simulation visible');
      
      // Wait to capture different stages of the simulation
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: 'demo-4-subprocess-stage-1.png', 
        fullPage: true 
      });
      console.log('✅ Screenshot: Subprocess simulation stage 1');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: 'demo-5-subprocess-stage-2.png', 
        fullPage: true 
      });
      console.log('✅ Screenshot: Subprocess simulation stage 2');
      
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: 'demo-6-subprocess-stage-3.png', 
        fullPage: true 
      });
      console.log('✅ Screenshot: Subprocess simulation stage 3');
      
      console.log('🎯 SUBPROCESS SIMULATION CAPTURED!');
      console.log('📁 Check demo-3 through demo-6 screenshots to see the rotation');
      
    } else {
      console.log('⚠️ Generate button still disabled - context might not be set up properly');
      console.log('📁 Check demo-1 and demo-2 screenshots to see the interface state');
    }
    
    // Keep browser open for 10 seconds to see the live simulation
    console.log('🕒 Keeping browser open for 10 seconds to see live simulation...');
    await page.waitForTimeout(10000);
    
    return true;
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

showSubprocessSimulation().then(success => {
  if (success) {
    console.log('\n🎯 Subprocess simulation demo completed!');
    console.log('📁 Check the demo-*.png files to see the subprocess simulation in action');
  } else {
    console.log('\n❌ Demo failed');
  }
  process.exit(success ? 0 : 1);
});