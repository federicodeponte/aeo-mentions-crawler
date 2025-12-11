const { chromium } = require('playwright');

async function testBlogGeneration() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🚀 Starting blog generation test...');
  
  try {
    // Navigate to the application
    console.log('📱 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Take a screenshot of the initial state
    await page.screenshot({ path: 'test-screenshots/01-homepage.png', fullPage: true });
    console.log('📸 Screenshot taken: homepage');
    
    // Look for blog generation interface
    console.log('🔍 Looking for blog generation interface...');
    
    // Try to find blog generation elements
    const blogElements = await page.locator('text=blog').count();
    const generateElements = await page.locator('text=generate').count();
    
    console.log(`Found ${blogElements} blog-related elements`);
    console.log(`Found ${generateElements} generate-related elements`);
    
    // Look for the blog generator component
    const blogGenerator = page.locator('[data-testid="blog-generator"], .blog-generator, [class*="blog"], [class*="generator"]');
    const blogGeneratorCount = await blogGenerator.count();
    console.log(`Found ${blogGeneratorCount} potential blog generator elements`);
    
    if (blogGeneratorCount > 0) {
      await page.screenshot({ path: 'test-screenshots/02-blog-generator-found.png', fullPage: true });
      console.log('📸 Screenshot taken: blog generator found');
      
      // Try to interact with the first generator element
      await blogGenerator.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'test-screenshots/03-after-click.png', fullPage: true });
      console.log('📸 Screenshot taken: after click');
    }
    
    // Check if there's a form or input field for blog generation
    const forms = await page.locator('form').count();
    const textareas = await page.locator('textarea').count();
    const inputs = await page.locator('input[type="text"], input:not([type])').count();
    
    console.log(`Found ${forms} forms, ${textareas} textareas, ${inputs} text inputs`);
    
    // Try to find CSV upload functionality
    const fileInputs = await page.locator('input[type="file"]').count();
    console.log(`Found ${fileInputs} file upload inputs`);
    
    if (fileInputs > 0) {
      await page.screenshot({ path: 'test-screenshots/04-file-upload-found.png', fullPage: true });
      console.log('📸 Screenshot taken: file upload found');
      
      // Test CSV upload if we can find the input
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles('./test-data/sample-keywords.csv');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'test-screenshots/05-after-csv-upload.png', fullPage: true });
      console.log('📸 Screenshot taken: after CSV upload');
    }
    
    // Look for generate or submit buttons
    const generateButtons = page.locator('button:has-text("Generate"), button:has-text("Process"), button:has-text("Submit")');
    const generateButtonCount = await generateButtons.count();
    
    if (generateButtonCount > 0) {
      console.log(`Found ${generateButtonCount} generate/process buttons`);
      await page.screenshot({ path: 'test-screenshots/06-buttons-found.png', fullPage: true });
      console.log('📸 Screenshot taken: buttons found');
      
      // Try clicking the first generate button
      console.log('🎯 Attempting to trigger blog generation...');
      await generateButtons.first().click();
      
      // Wait for any processing to start
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/07-after-generate-click.png', fullPage: true });
      console.log('📸 Screenshot taken: after generate click');
      
      // Look for any progress indicators or results
      const progressElements = await page.locator('.progress, [class*="progress"], [class*="loading"], .spinner').count();
      console.log(`Found ${progressElements} progress/loading elements`);
      
      if (progressElements > 0) {
        console.log('⏳ Waiting for processing to complete...');
        await page.waitForTimeout(10000); // Wait up to 10 seconds
        
        await page.screenshot({ path: 'test-screenshots/08-during-processing.png', fullPage: true });
        console.log('📸 Screenshot taken: during processing');
      }
      
      // Check for any results or output
      const resultElements = await page.locator('.result, [class*="result"], [class*="output"], .success').count();
      console.log(`Found ${resultElements} result elements`);
      
      if (resultElements > 0) {
        await page.screenshot({ path: 'test-screenshots/09-results-found.png', fullPage: true });
        console.log('📸 Screenshot taken: results found');
      }
    }
    
    console.log('✅ Blog generation test completed');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'test-screenshots/error.png', fullPage: true });
    console.log('📸 Error screenshot taken');
  } finally {
    await browser.close();
  }
}

// Create test data directory and sample CSV
async function setupTestData() {
  const fs = require('fs');
  const path = require('path');
  
  // Create directories
  if (!fs.existsSync('test-screenshots')) {
    fs.mkdirSync('test-screenshots');
  }
  
  if (!fs.existsSync('test-data')) {
    fs.mkdirSync('test-data');
  }
  
  // Create sample CSV
  const sampleCSV = `keyword,instructions
AI customer service automation,Focus on small business benefits
sustainable manufacturing processes,Highlight cost savings and ROI
precision agriculture technology,Emphasize data-driven insights`;
  
  fs.writeFileSync('test-data/sample-keywords.csv', sampleCSV);
  console.log('📁 Test data created');
}

// Run the test
setupTestData().then(() => {
  testBlogGeneration();
});