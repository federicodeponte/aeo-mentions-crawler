const { chromium } = require('playwright');

async function proveItWorks() {
  console.log('📸 Proving subprocess simulation works...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Go to the page
    await page.goto('http://localhost:3002/blogs');
    await page.waitForLoadState('domcontentloaded');
    
    // Set context manually in localStorage
    await page.evaluate(() => {
      localStorage.setItem('bulk-gpt-business-context', JSON.stringify({
        companyName: 'SCAILE',
        companyWebsite: 'https://scaile.tech'
      }));
    });
    
    // Reload to pick up context
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Wait for React hydration
    
    // Take initial screenshot
    await page.screenshot({ path: 'proof-1-initial-state.png', fullPage: true });
    console.log('📸 Screenshot 1: Initial state saved');
    
    // Check button state
    const buttonDisabled = await page.locator('button:has-text("Generate Blog Article")').isDisabled();
    const hasContext = await page.locator('text=Using Company Context').count();
    const keyword = await page.locator('input#keyword').inputValue();
    
    console.log(`Context visible: ${hasContext > 0}`);
    console.log(`Button disabled: ${buttonDisabled}`);
    console.log(`Keyword field value: "${keyword}"`);
    
    if (buttonDisabled) {
      // Fill keyword first
      await page.fill('input#keyword', 'test subprocess simulation');
      await page.waitForTimeout(1000);
      
      const buttonDisabledAfterKeyword = await page.locator('button:has-text("Generate Blog Article")').isDisabled();
      console.log(`Button disabled after keyword: ${buttonDisabledAfterKeyword}`);
      
      if (buttonDisabledAfterKeyword) {
        console.log('❌ Button still disabled even with context and keyword');
        await page.screenshot({ path: 'proof-button-still-disabled.png', fullPage: true });
        console.log('📸 Screenshot: Button still disabled');
        return;
      }
    }
    
    // Fill keyword and click generate
    await page.fill('input#keyword', 'test subprocess simulation');
    await page.click('button:has-text("Generate Blog Article")');
    
    console.log('🚀 Clicked generate button, waiting for simulation...');
    
    // Wait a moment for generation to start
    await page.waitForTimeout(2000);
    
    // Take screenshot of generation state
    await page.screenshot({ path: 'proof-2-generating.png', fullPage: true });
    console.log('📸 Screenshot 2: Generation state saved');
    
    // Check if simulation is running
    const isGenerating = await page.locator('text=Generating').count();
    const hasStage = await page.locator('text=/Stage \\d+:/').count();
    
    console.log(`"Generating" text visible: ${isGenerating > 0}`);
    console.log(`Stage text visible: ${hasStage > 0}`);
    
    if (hasStage > 0) {
      const stageText = await page.locator('text=/Stage \\d+:/').first().textContent();
      console.log(`Current stage: "${stageText}"`);
      
      // Wait and capture a few more stages
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(3000); // Wait for stage rotation
        const newStageText = await page.locator('text=/Stage \\d+:/').first().textContent().catch(() => 'none');
        await page.screenshot({ path: `proof-${3+i}-stage-${i+1}.png`, fullPage: true });
        console.log(`📸 Screenshot ${3+i}: Stage rotation ${i+1} - "${newStageText}"`);
      }
      
      console.log('✅ SUCCESS: Subprocess simulation is working!');
    } else {
      console.log('❌ FAILED: No subprocess simulation visible');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'proof-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

proveItWorks();