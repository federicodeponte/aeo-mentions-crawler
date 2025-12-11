const { chromium } = require('playwright');

async function finalTest() {
  console.log('🎯 Final subprocess simulation test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: false
  });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('domcontentloaded');
    
    // Set company context manually
    console.log('🔧 Setting company context...');
    await page.evaluate(() => {
      const context = {
        companyName: 'SCAILE',
        companyWebsite: 'https://scaile.tech'
      };
      localStorage.setItem('bulk-gpt-business-context', JSON.stringify(context));
    });
    
    // Refresh to pick up context
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Check if context is working
    const hasContext = await page.locator('text=Using Company Context').count();
    const buttonDisabled = await page.locator('button:has-text("Generate Blog Article")').isDisabled();
    
    console.log(`✅ Context working: ${hasContext > 0}`);
    console.log(`🔘 Button enabled: ${!buttonDisabled}`);
    
    if (hasContext > 0 && !buttonDisabled) {
      console.log('🚀 Testing subprocess simulation...');
      
      // Fill keyword and start generation
      await page.fill('input#keyword', 'subprocess simulation test');
      await page.click('button:has-text("Generate Blog Article")');
      
      console.log('⏳ Monitoring for subprocess stages...');
      
      // Monitor for stages for 15 seconds
      let stagesSeen = new Set();
      const startTime = Date.now();
      
      while (Date.now() - startTime < 15000) {
        try {
          const stageElements = await page.locator('text=/Stage \\d+:/', { timeout: 500 }).all();
          if (stageElements.length > 0) {
            const stageText = await stageElements[0].textContent();
            if (stageText) {
              const cleanStage = stageText.replace(/\.+$/, '').trim();
              if (!stagesSeen.has(cleanStage)) {
                stagesSeen.add(cleanStage);
                console.log(`📋 SUBPROCESS: ${cleanStage}`);
              }
            }
          }
          
          // Check for loading state
          const isGenerating = await page.locator('text=Generating').count();
          if (isGenerating === 0 && stagesSeen.size === 0) {
            console.log('❓ Not generating, checking why...');
          }
          
          await page.waitForTimeout(1000);
        } catch (e) {
          await page.waitForTimeout(500);
        }
      }
      
      if (stagesSeen.size > 0) {
        console.log(`🎉 SUCCESS! Subprocess simulation working - saw ${stagesSeen.size} stages`);
        console.log('📋 Stages captured:', Array.from(stagesSeen));
      } else {
        console.log('❌ FAILED: No subprocess stages detected');
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'failed-subprocess-test.png' });
        console.log('📸 Screenshot saved as failed-subprocess-test.png');
      }
    } else {
      console.log('❌ Context not working, cannot test subprocess simulation');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

finalTest();