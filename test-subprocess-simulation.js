const { chromium } = require('playwright');

async function testSubprocessSimulation() {
  console.log('🚀 Starting subprocess simulation test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to blogs page
    console.log('📍 Navigating to http://localhost:3002/blogs');
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('networkidle');
    
    // Fill in the keyword
    console.log('✏️ Filling in keyword...');
    const keywordInput = page.locator('input#keyword');
    await keywordInput.fill('AEO optimization services');
    
    // Click generate button
    console.log('🔘 Clicking Generate Blog Article button...');
    const generateButton = page.locator('button:has-text("Generate Blog Article")');
    await generateButton.click();
    
    console.log('⏳ Waiting for subprocess simulation to start...');
    
    // Wait for simulation to appear and capture stages
    await page.waitForSelector('text=/Stage \\d+:/', { timeout: 10000 });
    
    const stages = [];
    const startTime = Date.now();
    
    // Monitor stage changes for 30 seconds
    while (Date.now() - startTime < 30000) {
      try {
        const stageText = await page.locator('text=/Stage \\d+:/').first().textContent();
        if (stageText && !stages.includes(stageText)) {
          stages.push(stageText);
          console.log(`📋 Captured: ${stageText}`);
        }
        
        // Check for progress indicators
        const progressDots = await page.locator('text=/\\.{1,4}$/', { timeout: 1000 }).textContent().catch(() => null);
        if (progressDots) {
          console.log(`   └─ Progress dots: "${progressDots}"`);
        }
        
        await page.waitForTimeout(2000);
      } catch (e) {
        // Stage might have changed, continue
      }
    }
    
    console.log('✅ Test completed successfully!');
    console.log(`📊 Captured ${stages.length} different stages:`);
    stages.forEach((stage, i) => {
      console.log(`   ${i + 1}. ${stage}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testSubprocessSimulation()
  .then(success => {
    if (success) {
      console.log('🎉 Subprocess simulation test PASSED');
      process.exit(0);
    } else {
      console.log('💥 Subprocess simulation test FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
  });