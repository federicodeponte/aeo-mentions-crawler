const { chromium } = require('playwright');

async function testFixedContext() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true // Open dev tools to see console logs
  });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('domcontentloaded');
    
    // Set basic company context
    console.log('🔧 Setting company context...');
    await page.evaluate(() => {
      const basicContext = {
        companyName: 'SCAILE',
        companyWebsite: 'https://scaile.tech'
      };
      localStorage.setItem('bulk-gpt-business-context', JSON.stringify(basicContext));
    });
    
    // Refresh to pick up context
    console.log('🔄 Refreshing page to pick up context...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check console logs for our debug messages
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG]')) {
        console.log('🐛', msg.text());
      }
    });
    
    // Wait a bit more for React to rehydrate
    await page.waitForTimeout(3000);
    
    // Check the UI state
    const noContextWarning = await page.locator('text=No Company Context Set').count();
    const hasCompanyInfo = await page.locator('text=Using Company Context').count();
    const buttonDisabled = await page.locator('button:has-text("Generate Blog Article")').getAttribute('disabled');
    
    console.log(`❌ "No Company Context Set" showing: ${noContextWarning > 0}`);
    console.log(`✅ "Using Company Context" showing: ${hasCompanyInfo > 0}`);  
    console.log(`🔘 Generate button disabled: ${buttonDisabled !== null}`);
    
    if (hasCompanyInfo > 0 && buttonDisabled === null) {
      console.log('🎉 Context working! Testing subprocess simulation...');
      
      // Fill keyword and generate
      await page.fill('input#keyword', 'test subprocess simulation');
      await page.click('button:has-text("Generate Blog Article")');
      
      console.log('🚀 Generation started! Monitoring for subprocess stages...');
      
      // Monitor for 30 seconds
      const startTime = Date.now();
      let stagesSeen = [];
      
      while (Date.now() - startTime < 30000) {
        try {
          const stageElements = await page.locator('text=/Stage \\d+:/').all();
          if (stageElements.length > 0) {
            const stageText = await stageElements[0].textContent();
            if (stageText && !stagesSeen.includes(stageText.replace(/\.+$/, ''))) {
              const cleanStage = stageText.replace(/\.+$/, '');
              stagesSeen.push(cleanStage);
              console.log(`📋 STAGE VISIBLE: ${cleanStage}`);
            }
          }
          await page.waitForTimeout(1000);
        } catch (e) {
          // Continue monitoring
          await page.waitForTimeout(500);
        }
      }
      
      console.log(`✨ Monitoring complete! Saw ${stagesSeen.length} different stages.`);
    } else {
      console.log('❌ Context not working properly, cannot test subprocess simulation');
    }
    
    // Keep browser open for manual inspection
    console.log('🔍 Keeping browser open for manual inspection...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testFixedContext();