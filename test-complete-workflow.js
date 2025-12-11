const { chromium } = require('playwright');

async function testCompleteWorkflow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🚀 Testing complete workflow: Context + Blog Generation');
  
  try {
    // Step 1: Navigate to the application
    console.log('📱 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    await page.screenshot({ path: 'test-screenshots/01-homepage.png', fullPage: true });
    console.log('📸 Screenshot taken: homepage');
    
    // Step 2: Go to CONTEXT tab to set up company context
    console.log('🏢 Setting up company context...');
    await page.click('text=CONTEXT');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-screenshots/02-context-page.png', fullPage: true });
    console.log('📸 Screenshot taken: context page');
    
    // Look for website URL input or company analysis form
    console.log('🔍 Looking for company website input...');
    
    // Try different possible selectors for website input
    const websiteInputSelectors = [
      'input[placeholder*="website"]',
      'input[placeholder*="URL"]',
      'input[placeholder*="domain"]',
      'input[type="url"]',
      'input[name*="website"]',
      'input[name*="url"]'
    ];
    
    let websiteInput = null;
    for (const selector of websiteInputSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          websiteInput = element;
          console.log(`✅ Found website input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    if (websiteInput) {
      // Enter a test website URL
      console.log('🌐 Entering test website URL...');
      await websiteInput.fill('https://www.example-ai-company.com');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-screenshots/03-website-entered.png', fullPage: true });
      console.log('📸 Screenshot taken: website entered');
      
      // Look for and click analyze button
      const analyzeButtonSelectors = [
        'button:has-text("Analyze")',
        'button:has-text("Process")',
        'button:has-text("Submit")',
        'button[type="submit"]'
      ];
      
      let analyzeButton = null;
      for (const selector of analyzeButtonSelectors) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible() && await element.isEnabled()) {
            analyzeButton = element;
            console.log(`✅ Found analyze button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }
      
      if (analyzeButton) {
        console.log('🔄 Starting company analysis...');
        await analyzeButton.click();
        
        await page.screenshot({ path: 'test-screenshots/04-analysis-started.png', fullPage: true });
        console.log('📸 Screenshot taken: analysis started');
        
        // Wait for analysis to complete or timeout
        console.log('⏳ Waiting for company analysis to complete...');
        let analysisComplete = false;
        let maxWaitTime = 60000; // 1 minute
        let startTime = Date.now();
        
        while (!analysisComplete && (Date.now() - startTime) < maxWaitTime) {
          // Look for completion indicators
          const completionSelectors = [
            'text=Analysis complete',
            'text=Complete',
            'text=Success',
            '.success',
            '[class*="success"]',
            '[class*="complete"]'
          ];
          
          for (const selector of completionSelectors) {
            try {
              if (await page.locator(selector).isVisible()) {
                console.log(`✅ Analysis completed: ${selector}`);
                analysisComplete = true;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
          
          await page.waitForTimeout(2000);
        }
        
        await page.screenshot({ path: 'test-screenshots/05-analysis-result.png', fullPage: true });
        console.log('📸 Screenshot taken: analysis result');
      }
    } else {
      console.log('⚠️ No website input found, trying alternative context setup...');
      
      // Look for any other forms or buttons on the context page
      const buttons = await page.locator('button').count();
      console.log(`Found ${buttons} buttons on context page`);
      
      if (buttons > 0) {
        // Try clicking the first button to see what happens
        console.log('🔘 Trying first available button...');
        await page.locator('button').first().click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'test-screenshots/05-alt-context.png', fullPage: true });
        console.log('📸 Screenshot taken: alternative context');
      }
    }
    
    // Step 3: Go to BLOGS tab to generate content
    console.log('📝 Moving to blog generation...');
    await page.click('text=BLOGS');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-screenshots/06-blogs-with-context.png', fullPage: true });
    console.log('📸 Screenshot taken: blogs page with context');
    
    // Check if the "No Company Context Set" message is gone
    const noContextMessage = page.locator('text=No Company Context Set');
    const hasContext = !(await noContextMessage.isVisible());
    
    if (hasContext) {
      console.log('✅ Company context is now set!');
    } else {
      console.log('⚠️ Company context still not set, continuing anyway...');
    }
    
    // Fill in the keyword and try to generate
    console.log('✍️ Filling in blog keyword...');
    const keywordInput = page.locator('input[placeholder*="AI-powered"], input[placeholder*="keyword"]');
    await keywordInput.fill('AI customer service automation for small businesses');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-screenshots/07-keyword-entered.png', fullPage: true });
    console.log('📸 Screenshot taken: keyword entered');
    
    // Try to click generate button
    console.log('🎯 Looking for Generate button...');
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    // Check if button is enabled
    const isEnabled = await generateButton.isEnabled();
    console.log(`Generate button enabled: ${isEnabled}`);
    
    if (isEnabled) {
      console.log('🚀 Starting blog generation...');
      await generateButton.click();
      
      await page.screenshot({ path: 'test-screenshots/08-generation-started.png', fullPage: true });
      console.log('📸 Screenshot taken: generation started');
      
      // Monitor generation process
      console.log('👀 Monitoring blog generation...');
      let generationComplete = false;
      let maxWaitTime = 180000; // 3 minutes
      let startTime = Date.now();
      
      while (!generationComplete && (Date.now() - startTime) < maxWaitTime) {
        // Take periodic screenshots
        if ((Date.now() - startTime) % 30000 < 5000) { // Every 30 seconds
          await page.screenshot({ 
            path: `test-screenshots/09-progress-${Math.floor((Date.now() - startTime) / 1000)}s.png`, 
            fullPage: true 
          });
          console.log(`📸 Progress at ${Math.floor((Date.now() - startTime) / 1000)}s`);
        }
        
        // Check for completion
        const completionSelectors = [
          'text=Generation complete',
          'text=Blog generated',
          'text=Success',
          '.blog-content',
          '[class*="blog-content"]',
          '.generated-content',
          'article'
        ];
        
        for (const selector of completionSelectors) {
          try {
            if (await page.locator(selector).isVisible()) {
              console.log(`✅ Blog generation completed: ${selector}`);
              generationComplete = true;
              break;
            }
          } catch (e) {
            // Continue
          }
        }
        
        await page.waitForTimeout(5000);
      }
      
      await page.screenshot({ path: 'test-screenshots/10-final-result.png', fullPage: true });
      console.log('📸 Screenshot taken: final result');
      
      if (generationComplete) {
        console.log('🎉 Complete workflow test SUCCESS!');
        console.log('✅ Context setup and blog generation both worked');
        
        // Test our architectural fixes by looking for citations
        const links = await page.locator('a[href]').count();
        console.log(`🔗 Found ${links} links (potential citations from grounding URLs)`);
        
        if (links > 0) {
          console.log('✅ Grounding URL extraction likely working');
        }
        
      } else {
        console.log('⏰ Blog generation timed out but context was set');
      }
      
    } else {
      console.log('❌ Generate button is still disabled even after context setup');
      await page.screenshot({ path: 'test-screenshots/08-button-still-disabled.png', fullPage: true });
    }
    
  } catch (error) {
    console.error('❌ Error during complete workflow test:', error);
    await page.screenshot({ path: 'test-screenshots/error-complete-workflow.png', fullPage: true });
    console.log('📸 Error screenshot taken');
  } finally {
    console.log('🧹 Closing browser...');
    await browser.close();
  }
}

// Setup and run
async function setupTestData() {
  const fs = require('fs');
  
  if (!fs.existsSync('test-screenshots')) {
    fs.mkdirSync('test-screenshots');
  }
  
  console.log('📁 Complete workflow test environment ready');
}

setupTestData().then(() => {
  testCompleteWorkflow();
});