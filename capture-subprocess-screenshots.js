const { chromium } = require('playwright');

async function captureSubprocessScreenshots() {
  console.log('📸 Capturing subprocess simulation screenshots as proof...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate and set up
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('domcontentloaded');
    
    // Set context
    await page.evaluate(() => {
      localStorage.setItem('bulk-gpt-business-context', JSON.stringify({
        companyName: 'SCAILE',
        companyWebsite: 'https://scaile.tech'
      }));
    });
    
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Screenshot 1: Initial state
    await page.screenshot({ path: 'proof-1-ready-state.png', fullPage: true });
    console.log('📸 Screenshot 1: Ready state captured');
    
    // Start generation
    await page.fill('input#keyword', 'subprocess proof test');
    await page.click('button:has-text("Generate Blog Article")');
    
    console.log('🚀 Generation started, capturing subprocess stages...');
    
    // Screenshot 2: Generation started
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'proof-2-generation-started.png', fullPage: true });
    console.log('📸 Screenshot 2: Generation started');
    
    // Capture stage rotations
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(3000); // Wait for stage rotation
      await page.screenshot({ path: `proof-${3+i}-stage-rotation-${i+1}.png`, fullPage: true });
      
      // Try to capture the stage text
      try {
        const stageText = await page.locator('text=/Stage \\d+:/', { timeout: 1000 }).first().textContent();
        console.log(`📸 Screenshot ${3+i}: Stage rotation ${i+1} - "${stageText}"`);
      } catch (e) {
        console.log(`📸 Screenshot ${3+i}: Stage rotation ${i+1} - stage not visible`);
      }
    }
    
    console.log('✅ All screenshots captured as proof');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureSubprocessScreenshots();