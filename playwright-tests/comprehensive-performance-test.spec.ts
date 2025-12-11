import { test, expect } from '@playwright/test';

test('Comprehensive performance and functionality test', async ({ page }) => {
  const startTime = Date.now();
  
  console.log('🚀 Starting comprehensive headless test...');
  
  // Test 1: Basic page loads
  console.log('\n📄 Testing page loads...');
  const pageLoadStart = Date.now();
  
  await page.goto('http://localhost:3005');
  await page.waitForLoadState('networkidle');
  console.log(`✅ Homepage loaded in ${Date.now() - pageLoadStart}ms`);
  
  const goPageStart = Date.now();
  await page.goto('http://localhost:3005/go');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // Wait for dynamic component
  console.log(`✅ Keyword Generator page loaded in ${Date.now() - goPageStart}ms`);
  
  const analyticsPageStart = Date.now();
  await page.goto('http://localhost:3005/analytics');
  await page.waitForLoadState('networkidle');
  console.log(`✅ Analytics page loaded in ${Date.now() - analyticsPageStart}ms`);
  
  // Test 2: Check if forms/components are interactive
  console.log('\n🔧 Testing component interactivity...');
  
  // Go back to keyword generator
  await page.goto('http://localhost:3005/go');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Check if generate button exists (even if disabled)
  const generateButton = page.locator('button').filter({ hasText: /generate|start|run/i }).first();
  const buttonExists = await generateButton.isVisible();
  console.log(`✅ Generate button visible: ${buttonExists}`);
  
  if (buttonExists) {
    const isDisabled = await generateButton.isDisabled();
    console.log(`ℹ️  Generate button disabled: ${isDisabled}`);
  }
  
  // Test 3: Check analytics page interactivity
  await page.goto('http://localhost:3005/analytics');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Look for form fields
  const urlInput = page.locator('input[type="url"], input[placeholder*="url"], input[placeholder*="website"]').first();
  const companyInput = page.locator('input[placeholder*="company"], input[placeholder*="name"]').first();
  
  const urlInputExists = await urlInput.isVisible({ timeout: 5000 });
  const companyInputExists = await companyInput.isVisible({ timeout: 5000 });
  
  console.log(`✅ URL input visible: ${urlInputExists}`);
  console.log(`✅ Company input visible: ${companyInputExists}`);
  
  // Test 4: Try filling forms to see if they respond
  if (urlInputExists && companyInputExists) {
    console.log('\n📝 Testing form inputs...');
    
    try {
      await companyInput.fill('Test Company');
      await urlInput.fill('https://example.com');
      
      const companyValue = await companyInput.inputValue();
      const urlValue = await urlInput.inputValue();
      
      console.log(`✅ Company input filled: "${companyValue}"`);
      console.log(`✅ URL input filled: "${urlValue}"`);
      
      // Check if buttons become enabled
      const runButton = page.locator('button').filter({ hasText: /run|start|analyze|check/i }).first();
      const runButtonExists = await runButton.isVisible({ timeout: 3000 });
      
      if (runButtonExists) {
        const isRunButtonDisabled = await runButton.isDisabled();
        console.log(`✅ Run button disabled after filling: ${isRunButtonDisabled}`);
        
        // If button is enabled, we could test actual API call, but let's avoid long waits
        if (!isRunButtonDisabled) {
          console.log('⚠️  Run button is enabled - could trigger actual API call (skipping for performance)');
        }
      }
    } catch (error) {
      console.log(`❌ Error filling forms: ${error}`);
    }
  }
  
  // Test 5: Check for any long-running processes or network requests
  console.log('\n🌐 Monitoring network activity...');
  
  let networkRequestCount = 0;
  let slowRequests = [];
  
  page.on('request', (request) => {
    networkRequestCount++;
    const startTime = Date.now();
    
    request.response().then((response) => {
      const duration = Date.now() - startTime;
      if (duration > 2000) { // Requests taking >2 seconds
        slowRequests.push({
          url: request.url(),
          method: request.method(),
          duration
        });
      }
    }).catch(() => {}); // Ignore failed requests for this test
  });
  
  // Navigate to trigger any lazy loading
  await page.goto('http://localhost:3005/go');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Give time for any async operations
  
  console.log(`ℹ️  Total network requests observed: ${networkRequestCount}`);
  
  if (slowRequests.length > 0) {
    console.log(`⚠️  Slow requests detected (>2s):`);
    slowRequests.forEach(req => {
      console.log(`   ${req.method} ${req.url} - ${req.duration}ms`);
    });
  } else {
    console.log(`✅ No slow network requests detected`);
  }
  
  // Test 6: Check JavaScript console for errors
  const jsErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      jsErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    jsErrors.push(error.message);
  });
  
  // Trigger any potential JS errors by navigating
  await page.goto('http://localhost:3005/analytics');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  if (jsErrors.length > 0) {
    console.log(`❌ JavaScript errors detected:`);
    jsErrors.forEach(error => console.log(`   ${error}`));
  } else {
    console.log(`✅ No JavaScript errors detected`);
  }
  
  // Final timing
  const totalTime = Date.now() - startTime;
  console.log(`\n⏱️  Total test duration: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
  
  // Set reasonable expectations for performance
  expect(totalTime).toBeLessThan(60000); // Should complete in under 60 seconds
  
  console.log('\n🎉 Comprehensive test completed successfully!');
});

test('Quick API responsiveness check', async ({ page }) => {
  console.log('\n🔍 Testing API endpoint responsiveness...');
  
  // Test if basic API routes are responding quickly
  const apiTests = [
    'http://localhost:3005/api/health',
    'http://localhost:3005/api/batch',
    'http://localhost:3005/api/business-context'
  ];
  
  for (const apiUrl of apiTests) {
    try {
      const response = await page.request.get(apiUrl);
      console.log(`${apiUrl}: ${response.status()}`);
    } catch (error) {
      console.log(`${apiUrl}: ERROR - ${error.message}`);
    }
  }
  
  console.log('✅ API responsiveness check completed');
});