const { chromium } = require('playwright');

async function testFixedRouting() {
  console.log('🔧 Testing fixed routing and subprocess simulation...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the page
    console.log('📍 Navigating to http://localhost:3002/blogs');
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'fixed-routing-test.png', fullPage: true });
    console.log('📸 Screenshot saved: fixed-routing-test.png');
    
    // Check if page loaded properly
    const pageTitle = await page.title();
    const hasError = await page.locator('text=missing required error').count();
    const hasContent = await page.locator('text=Generate Blog Article').count();
    
    console.log(`Page title: "${pageTitle}"`);
    console.log(`Error message visible: ${hasError > 0}`);
    console.log(`"Generate Blog Article" visible: ${hasContent > 0}`);
    
    if (hasContent > 0) {
      console.log('✅ Page loaded successfully!');
      
      // Set context and test subprocess simulation
      await page.evaluate(() => {
        localStorage.setItem('bulk-gpt-business-context', JSON.stringify({
          companyName: 'SCAILE',
          companyWebsite: 'https://scaile.tech'
        }));
      });
      
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      
      // Check if context is working
      const contextVisible = await page.locator('text=Using Company Context').count();
      console.log(`Company context visible: ${contextVisible > 0}`);
      
      if (contextVisible > 0) {
        // Test subprocess simulation
        await page.fill('input#keyword', 'subprocess simulation test');
        await page.click('button:has-text("Generate Blog Article")');
        
        console.log('🚀 Started generation, monitoring subprocess simulation...');
        
        // Monitor for 10 seconds
        let stages = new Set();
        const startTime = Date.now();
        
        while (Date.now() - startTime < 10000) {
          try {
            const stageText = await page.locator('text=/Stage \\d+:/', { timeout: 500 }).first().textContent();
            if (stageText) {
              const cleanStage = stageText.replace(/\.+$/, '').trim();
              if (!stages.has(cleanStage)) {
                stages.add(cleanStage);
                console.log(`📋 Subprocess stage: ${cleanStage}`);
              }
            }
          } catch (e) {
            // No stage visible yet
          }
          await page.waitForTimeout(1000);
        }
        
        if (stages.size > 0) {
          console.log(`🎉 SUCCESS! Subprocess simulation working - captured ${stages.size} stages`);
        } else {
          console.log('❌ No subprocess stages detected');
        }
      }
      
    } else {
      console.log('❌ Page not loading properly');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'routing-test-error.png' });
  } finally {
    await browser.close();
  }
}

testFixedRouting();