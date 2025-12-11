const { chromium } = require('playwright');

async function debugContext() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('domcontentloaded');
    
    // Check localStorage for context
    const contextData = await page.evaluate(() => {
      const stored = localStorage.getItem('bulk-gpt-business-context');
      return stored ? JSON.parse(stored) : null;
    });
    
    console.log('📊 Context data in localStorage:');
    console.log(JSON.stringify(contextData, null, 2));
    
    // Set basic company context if missing
    if (!contextData || !contextData.companyName) {
      console.log('🔧 Setting basic context...');
      await page.evaluate(() => {
        const basicContext = {
          companyName: 'SCAILE',
          companyWebsite: 'https://scaile.tech'
        };
        localStorage.setItem('bulk-gpt-business-context', JSON.stringify(basicContext));
      });
      
      // Refresh page to pick up new context
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
    }
    
    // Check if context warning is still showing
    const hasWarning = await page.locator('text=No Company Context Set').count();
    console.log(`⚠️  "No Company Context Set" warning visible: ${hasWarning > 0}`);
    
    // Check if company info section is showing
    const hasCompanyInfo = await page.locator('text=Using Company Context').count();
    console.log(`✅ "Using Company Context" section visible: ${hasCompanyInfo > 0}`);
    
    if (hasCompanyInfo > 0) {
      console.log('🎉 Context is working! Now testing generation...');
      
      // Fill keyword and try to generate
      await page.locator('input#keyword').fill('test subprocess simulation');
      await page.click('button:has-text("Generate Blog Article")');
      
      console.log('🚀 Generation started! Waiting for subprocess simulation...');
      
      // Wait for simulation to appear
      try {
        await page.waitForSelector('text=/Stage \\d+:/', { timeout: 5000 });
        const stageText = await page.locator('text=/Stage \\d+:/').first().textContent();
        console.log(`📋 Subprocess simulation working! Current stage: ${stageText}`);
      } catch (e) {
        console.log('❌ Subprocess simulation not appearing after 5 seconds');
      }
    }
    
    await page.waitForTimeout(10000); // Keep browser open for inspection
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugContext();