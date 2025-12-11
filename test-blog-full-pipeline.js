const { chromium } = require('playwright');

async function testFullBlogPipeline() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🚀 Starting FULL blog generation pipeline test...');
  
  try {
    // Navigate directly to the blog generation page
    console.log('📱 Navigating to http://localhost:3000/blogs');
    await page.goto('http://localhost:3000/blogs', { waitUntil: 'networkidle' });
    
    // Take a screenshot of the blog page
    await page.screenshot({ path: 'test-screenshots/01-blog-page.png', fullPage: true });
    console.log('📸 Screenshot taken: blog page');
    
    // Wait for the blog generator component to load
    console.log('⏳ Waiting for BlogGenerator component...');
    await page.waitForTimeout(3000);
    
    // Look for the CSV upload input
    console.log('🔍 Looking for CSV upload input...');
    const fileInput = page.locator('input[type="file"]');
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    await page.screenshot({ path: 'test-screenshots/02-csv-input-found.png', fullPage: true });
    console.log('📸 Screenshot taken: CSV input found');
    
    // Upload the test CSV file
    console.log('📁 Uploading test CSV file...');
    await fileInput.setInputFiles('./test-data/sample-keywords.csv');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-screenshots/03-csv-uploaded.png', fullPage: true });
    console.log('📸 Screenshot taken: CSV uploaded');
    
    // Look for and click the process/generate button
    console.log('🎯 Looking for Process button...');
    const processButton = page.locator('button:has-text("Process"), button:has-text("Generate"), button[type="submit"]');
    await processButton.waitFor({ timeout: 10000 });
    
    await page.screenshot({ path: 'test-screenshots/04-before-process.png', fullPage: true });
    console.log('📸 Screenshot taken: before process');
    
    // Click the process button to start blog generation
    console.log('▶️ Starting blog generation process...');
    await processButton.click();
    
    await page.screenshot({ path: 'test-screenshots/05-process-started.png', fullPage: true });
    console.log('📸 Screenshot taken: process started');
    
    // Monitor for progress indicators and results
    console.log('👀 Monitoring for progress and results...');
    
    // Wait for various possible states
    const progressSelectors = [
      '.progress',
      '[class*="progress"]',
      '[class*="loading"]',
      '.spinner',
      '[data-testid*="loading"]',
      'text=Processing',
      'text=Generating',
      'text=In Progress'
    ];
    
    const resultSelectors = [
      '.result',
      '[class*="result"]',
      '[class*="output"]',
      '.success',
      '[data-testid*="result"]',
      'text=Generated',
      'text=Complete',
      'table tbody tr' // Results table
    ];
    
    let processingComplete = false;
    let maxWaitTime = 120000; // 2 minutes max
    let startTime = Date.now();
    
    while (!processingComplete && (Date.now() - startTime) < maxWaitTime) {
      // Check for progress indicators
      for (const selector of progressSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            console.log(`⏳ Found progress indicator: ${selector}`);
            await page.screenshot({ 
              path: `test-screenshots/06-progress-${Date.now()}.png`, 
              fullPage: true 
            });
          }
        } catch (e) {
          // Selector not found, continue
        }
      }
      
      // Check for results
      for (const selector of resultSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible()) {
            console.log(`✅ Found result indicator: ${selector}`);
            await page.screenshot({ 
              path: `test-screenshots/07-results-${Date.now()}.png`, 
              fullPage: true 
            });
            processingComplete = true;
            break;
          }
        } catch (e) {
          // Selector not found, continue
        }
      }
      
      // Wait a bit before next check
      await page.waitForTimeout(5000);
    }
    
    // Final screenshot regardless of outcome
    await page.screenshot({ path: 'test-screenshots/08-final-state.png', fullPage: true });
    console.log('📸 Screenshot taken: final state');
    
    // Try to extract any visible results or error messages
    console.log('📊 Checking for any visible results or messages...');
    
    // Look for any tables with results
    const tables = await page.locator('table').count();
    if (tables > 0) {
      console.log(`📋 Found ${tables} tables - likely results displayed`);
      
      // Try to get some table content
      const tableRows = await page.locator('table tbody tr').count();
      console.log(`📊 Found ${tableRows} result rows`);
      
      if (tableRows > 0) {
        // Get text content of first few rows
        for (let i = 0; i < Math.min(3, tableRows); i++) {
          try {
            const rowText = await page.locator(`table tbody tr:nth-child(${i + 1})`).textContent();
            console.log(`Row ${i + 1}: ${rowText?.substring(0, 100)}...`);
          } catch (e) {
            console.log(`Could not read row ${i + 1}`);
          }
        }
      }
    }
    
    // Look for any error messages
    const errorSelectors = [
      '.error',
      '[class*="error"]',
      '[class*="danger"]',
      '.text-red',
      '[class*="text-red"]',
      'text=Error',
      'text=Failed'
    ];
    
    for (const selector of errorSelectors) {
      try {
        const element = page.locator(selector);
        const count = await element.count();
        if (count > 0) {
          console.log(`❌ Found ${count} error elements with selector: ${selector}`);
          const errorText = await element.first().textContent();
          console.log(`Error message: ${errorText?.substring(0, 200)}...`);
        }
      } catch (e) {
        // Selector not found, continue
      }
    }
    
    if (processingComplete) {
      console.log('🎉 Blog generation pipeline completed successfully!');
    } else {
      console.log('⏰ Pipeline test timed out after 2 minutes');
    }
    
  } catch (error) {
    console.error('❌ Error during blog pipeline test:', error);
    await page.screenshot({ path: 'test-screenshots/error-pipeline.png', fullPage: true });
    console.log('📸 Error screenshot taken');
  } finally {
    console.log('🧹 Closing browser...');
    await browser.close();
  }
}

// Create test data if it doesn't exist
async function setupTestData() {
  const fs = require('fs');
  
  if (!fs.existsSync('test-screenshots')) {
    fs.mkdirSync('test-screenshots');
  }
  
  if (!fs.existsSync('test-data')) {
    fs.mkdirSync('test-data');
  }
  
  // Create a more comprehensive test CSV
  const sampleCSV = `keyword,instructions
AI customer service automation,"Focus on ROI and implementation benefits for small businesses"
sustainable manufacturing processes,"Highlight environmental impact and cost savings"`;
  
  fs.writeFileSync('test-data/sample-keywords.csv', sampleCSV);
  console.log('📁 Enhanced test data created');
}

// Run the test
setupTestData().then(() => {
  testFullBlogPipeline();
});