const { chromium } = require('playwright');

async function testEnhancedKeywordsUI() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== TESTING ENHANCED KEYWORDS SUBPROCESS SIMULATION ===');
    
    // Navigate to keywords page
    await page.goto('http://localhost:3002/keywords');
    await page.waitForLoadState('networkidle');
    
    // Verify button is enabled (we already fixed this)
    const generateButton = page.locator('button').filter({ hasText: 'Generate Keywords' });
    const isDisabled = await generateButton.getAttribute('disabled');
    
    console.log('Generate button disabled:', isDisabled !== null);
    
    if (isDisabled === null) {
      console.log('✅ Button is enabled! Testing subprocess simulation...');
      
      // Click the button to start generation
      await generateButton.click();
      
      // Wait for loading state to appear
      await page.waitForTimeout(1000);
      
      // Monitor the subprocess messages for 15 seconds
      console.log('\n🎬 MONITORING SUBPROCESS SIMULATION:');
      
      const capturedSteps = [];
      for (let i = 0; i < 6; i++) { // Monitor for ~15 seconds (6 x 2.5s intervals)
        try {
          // Try to find the subprocess text
          const stepElement = page.locator('span').filter({ hasText: /Stage \d+:/ }).first();
          const currentStep = await stepElement.textContent({ timeout: 3000 });
          
          if (currentStep && !capturedSteps.includes(currentStep)) {
            console.log(`📍 ${new Date().toLocaleTimeString()}: ${currentStep}`);
            capturedSteps.push(currentStep);
          }
          
          await page.waitForTimeout(2500); // Wait for next rotation
        } catch (e) {
          console.log('⚠️ Could not capture step at interval', i+1);
          break;
        }
      }
      
      console.log('\n📊 SIMULATION RESULTS:');
      console.log('- Captured steps:', capturedSteps.length);
      console.log('- Expected steps: 12 (from Stage 1 to Stage 12)');
      
      if (capturedSteps.length >= 3) {
        console.log('✅ SUCCESS: Subprocess simulation is working!');
        console.log('🎯 Enhanced UI shows real keyword generation pipeline stages');
      } else {
        console.log('❌ ISSUE: Not enough steps captured');
      }
      
      // Take a screenshot during loading
      await page.screenshot({ path: 'keywords-enhanced-ui.png' });
      
      console.log('\n🔍 ENHANCED FEATURES VERIFIED:');
      
      // Check if progress bar exists
      const progressBar = await page.locator('.bg-gradient-to-r.from-purple-500.to-blue-500').count();
      console.log('- Progress bar present:', progressBar > 0);
      
      // Check if time remaining is shown
      const timeRemaining = await page.locator('text~="s remaining"').count();
      console.log('- Time remaining indicator:', timeRemaining > 0);
      
      // Check if animated icon exists
      const animatedIcon = await page.locator('.animate-spin').count();
      console.log('- Animated loading icon:', animatedIcon > 0);
      
      console.log('\n📸 Screenshot saved as keywords-enhanced-ui.png');
      
    } else {
      console.log('❌ Button is still disabled - need to fix first');
    }

  } catch (error) {
    console.error('Error testing enhanced UI:', error);
  } finally {
    await browser.close();
  }
}

testEnhancedKeywordsUI();