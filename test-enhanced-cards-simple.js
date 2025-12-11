const { chromium } = require('playwright');

async function testEnhancedCardsSimple() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== TESTING ENHANCED CARD UI ===');
    
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Check if button exists and click it
    try {
      const generateButton = page.locator('button:has-text("Generate Keywords")');
      await generateButton.click({ timeout: 5000 });
      console.log('✅ Successfully clicked Generate button');
      
      // Wait for loading UI
      await page.waitForTimeout(3000);
      
      // Check for enhanced UI elements
      const progressHeader = await page.locator('h3:has-text("Keyword Generation in Progress")').count();
      console.log('Progress header found:', progressHeader > 0);
      
      const stageCards = await page.locator('div.border.rounded-lg.p-4').count();
      console.log('Stage cards found:', stageCards);
      
      const activeCard = await page.locator('.border-purple-500').count();
      console.log('Active stage card found:', activeCard > 0);
      
      // Take screenshot
      await page.screenshot({ path: 'enhanced-ui-test.png', fullPage: true });
      console.log('📸 Screenshot saved');
      
      if (stageCards >= 12) {
        console.log('✅ SUCCESS: Enhanced card-based UI is working!');
        console.log(`🎯 Found ${stageCards} individual stage cards as expected`);
      } else {
        console.log('❌ Issue: Expected 12 stage cards, found', stageCards);
      }
      
    } catch (e) {
      console.log('❌ Could not click button or UI not working:', e.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testEnhancedCardsSimple();