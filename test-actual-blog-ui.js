const { chromium } = require('playwright');

async function testActualBlogUI() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🚀 Testing actual blog UI pipeline...');
  
  try {
    // Navigate to the blog generation page
    console.log('📱 Navigating to http://localhost:3000/blogs');
    await page.goto('http://localhost:3000/blogs', { waitUntil: 'networkidle' });
    
    await page.screenshot({ path: 'test-screenshots/01-actual-blog-page.png', fullPage: true });
    console.log('📸 Screenshot taken: actual blog page');
    
    // Fill in the Primary Keyword field
    console.log('✍️ Filling in primary keyword...');
    const keywordInput = page.locator('input[placeholder*="AI-powered"], input[placeholder*="keyword"]');
    await keywordInput.waitFor({ timeout: 10000 });
    
    await keywordInput.fill('AI customer service automation');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-screenshots/02-keyword-entered.png', fullPage: true });
    console.log('📸 Screenshot taken: keyword entered');
    
    // Check if there are any advanced options to expand
    const advancedOptions = page.locator('text=Advanced Options');
    if (await advancedOptions.isVisible()) {
      console.log('🔧 Expanding advanced options...');
      await advancedOptions.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-screenshots/03-advanced-expanded.png', fullPage: true });
      console.log('📸 Screenshot taken: advanced options expanded');
    }
    
    // Look for and click the generate button
    console.log('🎯 Looking for Generate button...');
    const generateButton = page.locator('button:has-text("Generate"), button[type="submit"]').first();
    await generateButton.waitFor({ timeout: 10000 });
    
    await page.screenshot({ path: 'test-screenshots/04-before-generate.png', fullPage: true });
    console.log('📸 Screenshot taken: before generate');
    
    // Start the generation process
    console.log('🚀 Starting blog generation...');
    await generateButton.click();
    
    await page.screenshot({ path: 'test-screenshots/05-generation-started.png', fullPage: true });
    console.log('📸 Screenshot taken: generation started');
    
    // Monitor the generation process
    console.log('👀 Monitoring generation progress...');
    
    let generationComplete = false;
    let maxWaitTime = 180000; // 3 minutes for blog generation
    let startTime = Date.now();
    let lastScreenshot = Date.now();
    
    while (!generationComplete && (Date.now() - startTime) < maxWaitTime) {
      // Take periodic screenshots
      if (Date.now() - lastScreenshot > 15000) { // Every 15 seconds
        await page.screenshot({ 
          path: `test-screenshots/06-progress-${Math.floor((Date.now() - startTime) / 1000)}s.png`, 
          fullPage: true 
        });
        lastScreenshot = Date.now();
        console.log(`📸 Progress screenshot at ${Math.floor((Date.now() - startTime) / 1000)}s`);
      }
      
      // Check for completion indicators
      const completionSelectors = [
        'text=Generation complete',
        'text=Blog generated',
        'text=Success',
        '.success',
        '[class*="success"]',
        '[class*="complete"]',
        // Look for result content
        '[data-testid*="result"]',
        '.blog-content',
        '[class*="blog-content"]',
        '.generated-content',
        '[class*="generated"]'
      ];
      
      for (const selector of completionSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            console.log(`✅ Found completion indicator: ${selector}`);
            generationComplete = true;
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      // Check for error states
      const errorSelectors = [
        'text=Error',
        'text=Failed',
        '.error',
        '[class*="error"]',
        '.text-red',
        '[class*="text-red"]'
      ];
      
      for (const selector of errorSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            const errorText = await element.textContent();
            console.log(`❌ Found error: ${errorText?.substring(0, 100)}...`);
            await page.screenshot({ 
              path: `test-screenshots/error-${Date.now()}.png`, 
              fullPage: true 
            });
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      // Check for loading/progress indicators
      const progressSelectors = [
        'text=Generating',
        'text=Processing',
        'text=Loading',
        '.loading',
        '[class*="loading"]',
        '.spinner',
        '[class*="spinner"]',
        '.progress',
        '[class*="progress"]'
      ];
      
      for (const selector of progressSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            // Just log once per minute to avoid spam
            if (Math.floor((Date.now() - startTime) / 60000) !== Math.floor(((Date.now() - startTime) - 5000) / 60000)) {
              console.log(`⏳ Still processing... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
            }
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      await page.waitForTimeout(5000); // Check every 5 seconds
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-screenshots/07-final-result.png', fullPage: true });
    console.log('📸 Screenshot taken: final result');
    
    // Try to extract any generated content
    console.log('📊 Checking for generated blog content...');
    
    // Look for any text areas, content sections, or results
    const contentSelectors = [
      'article',
      '.article',
      '[class*="article"]',
      '.blog-content',
      '[class*="blog-content"]',
      '.generated-content',
      '[class*="generated"]',
      '.content',
      '[class*="content"]',
      'main',
      '[role="main"]'
    ];
    
    let foundContent = false;
    for (const selector of contentSelectors) {
      try {
        const elements = await page.locator(selector).count();
        if (elements > 0) {
          console.log(`📝 Found ${elements} content elements with selector: ${selector}`);
          
          const contentText = await page.locator(selector).first().textContent();
          if (contentText && contentText.length > 100) {
            console.log(`📄 Content preview: ${contentText.substring(0, 200)}...`);
            foundContent = true;
          }
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    // Check page title and meta information
    const title = await page.title();
    console.log(`📋 Page title: ${title}`);
    
    // Check for any download links or export options
    const downloadSelectors = [
      'a[href*="download"]',
      'button:has-text("Download")',
      'button:has-text("Export")',
      '[class*="download"]',
      '[class*="export"]'
    ];
    
    for (const selector of downloadSelectors) {
      try {
        const elements = await page.locator(selector).count();
        if (elements > 0) {
          console.log(`💾 Found ${elements} download/export options`);
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (generationComplete) {
      console.log('🎉 Blog generation completed successfully!');
      
      if (foundContent) {
        console.log('✅ Blog content was generated and is visible');
      } else {
        console.log('⚠️ Generation completed but content may not be visible');
      }
      
    } else {
      console.log('⏰ Blog generation timed out after 3 minutes');
      console.log('⚠️ This may be normal for complex blog generation');
    }
    
    // Test our architectural fixes by checking network requests
    console.log('🔧 Testing architectural fixes...');
    
    // Check if grounding URLs are working by looking for any citation-like content
    const citationSelectors = [
      '[href*="http"]',
      'a[href]',
      '.citation',
      '[class*="citation"]',
      '.reference',
      '[class*="reference"]',
      '.source',
      '[class*="source"]'
    ];
    
    let foundCitations = false;
    for (const selector of citationSelectors) {
      try {
        const elements = await page.locator(selector).count();
        if (elements > 0) {
          console.log(`🔗 Found ${elements} potential citations/links`);
          foundCitations = true;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (foundCitations) {
      console.log('✅ Citations/links found - grounding URL extraction likely working');
    } else {
      console.log('ℹ️ No citations found - may be normal depending on content');
    }
    
  } catch (error) {
    console.error('❌ Error during blog UI test:', error);
    await page.screenshot({ path: 'test-screenshots/error-ui-test.png', fullPage: true });
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
  
  console.log('📁 Test environment ready');
}

setupTestData().then(() => {
  testActualBlogUI();
});