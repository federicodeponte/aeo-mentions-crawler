const { chromium } = require('playwright');

async function showScreenshots() {
  console.log('📸 TAKING SCREENSHOTS: Subprocess simulation on :3002');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // First, set up business context
    console.log('📱 0. Setting up business context at /context');
    await page.goto('http://localhost:3002/context', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Try to fill company info if form is available
    try {
      const companyInput = page.locator('input[placeholder*="company"], input[name*="company"], input[id*="company"]').first();
      if (await companyInput.count() > 0) {
        await companyInput.fill('SCAILE');
        await page.waitForTimeout(500);
      }
      
      const urlInput = page.locator('input[placeholder*="website"], input[name*="url"], input[id*="url"]').first();
      if (await urlInput.count() > 0) {
        await urlInput.fill('https://scaile.tech');
        await page.waitForTimeout(500);
      }
      
      // Look for analyze/submit button
      const analyzeButton = page.locator('button').filter({ hasText: /analyze|submit|save/i }).first();
      if (await analyzeButton.count() > 0) {
        await analyzeButton.click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('⚠️ Could not set up context, continuing anyway');
    }
    
    console.log('📱 1. Loading http://localhost:3002/blogs');
    await page.goto('http://localhost:3002/blogs', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Wait for React hydration
    await page.waitForTimeout(3000);
    
    // Screenshot 1: Initial page load
    await page.screenshot({ 
      path: 'screenshot-1-initial-page.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot 1: Initial page saved');
    
    // Find and fill the primary keyword input specifically
    console.log('📱 2. Filling primary keyword field...');
    
    // Look for the keyword input field
    const keywordInput = page.locator('input[placeholder*="keyword"], input[placeholder*="topic"]').first();
    if (await keywordInput.count() > 0) {
      await keywordInput.fill('AEO optimization services');
      await page.waitForTimeout(1000);
      console.log('✅ Filled keyword input');
    } else {
      // Fallback - try to fill any visible input
      const inputs = await page.locator('input:visible').count();
      console.log(`🔍 Found ${inputs} visible inputs, trying to fill the first one`);
      if (inputs > 0) {
        await page.locator('input:visible').first().fill('AEO optimization services');
        await page.waitForTimeout(1000);
      }
    }
    
    // Screenshot 2: Form filled
    await page.screenshot({ 
      path: 'screenshot-2-form-filled.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot 2: Form filled saved');
    
    // Try to find and click generate button
    console.log('📱 3. Looking for generate button...');
    
    // Wait for button to become enabled (check for disabled attribute)
    await page.waitForTimeout(1000);
    
    const generateButton = page.locator('button').filter({ hasText: /generate/i }).first();
    const hasGenerateButton = await generateButton.count() > 0;
    
    if (hasGenerateButton) {
      // Check if button is enabled
      const isDisabled = await generateButton.getAttribute('disabled');
      console.log(`Generate button found, disabled: ${isDisabled !== null}`);
      
      if (isDisabled === null) {
        console.log('📱 3. Clicking generate button to trigger subprocess simulation...');
        await generateButton.click();
        await page.waitForTimeout(2000);
        
        // Screenshot 3: Generation started (should show subprocess simulation)
        await page.screenshot({ 
          path: 'screenshot-3-generation-started.png', 
          fullPage: true 
        });
        console.log('✅ Screenshot 3: Generation started saved');
        
        // Wait and take another screenshot to show the rotating messages
        await page.waitForTimeout(3000);
        
        // Screenshot 4: Subprocess simulation in progress
        await page.screenshot({ 
          path: 'screenshot-4-subprocess-simulation.png', 
          fullPage: true 
        });
        console.log('✅ Screenshot 4: Subprocess simulation saved');
        
        // Wait a bit more to capture different stage messages
        await page.waitForTimeout(3000);
        
        // Screenshot 5: Different stage message
        await page.screenshot({ 
          path: 'screenshot-5-different-stage.png', 
          fullPage: true 
        });
        console.log('✅ Screenshot 5: Different stage message saved');
        
      } else {
        console.log('⚠️ Generate button is disabled, taking screenshot of form only');
      }
    } else {
      console.log('⚠️ No generate button found, taking form screenshot only');
    }
    
    console.log('\n📸 SCREENSHOTS COMPLETE:');
    console.log('   screenshot-1-initial-page.png - Initial page load');
    console.log('   screenshot-2-form-filled.png - Form with test data');
    console.log('   screenshot-3-generation-started.png - Generation triggered');
    console.log('   screenshot-4-subprocess-simulation.png - Simulation in progress');
    console.log('   screenshot-5-different-stage.png - Different stage message');
    
    return true;
    
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

showScreenshots().then(success => {
  if (success) {
    console.log('\n🎯 All screenshots captured successfully!');
    console.log('📁 Check the files to see the subprocess simulation in action');
  } else {
    console.log('\n❌ Screenshot capture failed');
  }
  process.exit(success ? 0 : 1);
});