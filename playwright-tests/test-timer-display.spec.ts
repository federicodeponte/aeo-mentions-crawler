import { test, expect } from '@playwright/test';

test('Check for 120 seconds timer text in UI components', async ({ page }) => {
  // Test keyword generator page
  console.log('Testing keyword generator page...');
  await page.goto('http://localhost:3005/go');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Wait for component to load
  
  // Check if page contains any reference to 120 seconds
  const pageContent = await page.textContent('body');
  console.log('Keyword generator page loaded');
  
  // Look for various timer formats
  const has120sec = pageContent?.includes('120') || pageContent?.includes('2:00') || pageContent?.includes('2 min');
  const has50sec = pageContent?.includes('50 sec') || pageContent?.includes('50sec');
  
  console.log('Contains 120/2min reference:', has120sec);
  console.log('Contains old 50sec reference:', has50sec);
  
  if (has50sec) {
    console.log('❌ Still contains old 50 second reference');
    // Find the specific text
    const fiftySecText = await page.locator('text=/50.*sec/i').first().textContent().catch(() => 'not found');
    console.log('50sec text found:', fiftySecText);
  }
  
  if (has120sec) {
    console.log('✅ Contains 120 second / 2 minute reference');
  }
  
  // Test analytics page  
  console.log('\nTesting analytics page...');
  await page.goto('http://localhost:3005/analytics');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  const analyticsContent = await page.textContent('body');
  console.log('Analytics page loaded');
  
  const analyticsHas120 = analyticsContent?.includes('120') || analyticsContent?.includes('2:00') || analyticsContent?.includes('2 min');
  const analyticsHas50 = analyticsContent?.includes('50 sec') || analyticsContent?.includes('50sec');
  
  console.log('Analytics contains 120/2min reference:', analyticsHas120);
  console.log('Analytics contains old 50sec reference:', analyticsHas50);
  
  if (analyticsHas50) {
    console.log('❌ Analytics still contains old 50 second reference');
  }
  
  // Overall result
  const overallFixed = (has120sec || analyticsHas120) && !has50sec && !analyticsHas50;
  console.log('\n🎯 Overall Timer Fix Status:', overallFixed ? '✅ FIXED' : '❌ NEEDS ATTENTION');
  
  // For the test to pass, we want to see 120-second references and NO 50-second references
  expect(has120sec || analyticsHas120, 'Should contain 120 second / 2 minute references').toBeTruthy();
  expect(has50sec || analyticsHas50, 'Should NOT contain old 50 second references').toBeFalsy();
});

test('Check specific timer display when components load', async ({ page }) => {
  console.log('Testing timer display in components...');
  await page.goto('http://localhost:3005/go');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000); // Wait for dynamic component
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-results/keyword-generator-page.png', fullPage: true });
  
  // Look for any timer elements specifically  
  const timerElements = await page.locator('text=/\\d+\\s*(sec|second|min|minute)/i').all();
  
  if (timerElements.length > 0) {
    console.log(`Found ${timerElements.length} timer element(s):`);
    for (let i = 0; i < timerElements.length; i++) {
      const text = await timerElements[i].textContent();
      console.log(`  Timer ${i + 1}: "${text}"`);
      
      if (text?.includes('50')) {
        console.log('❌ Found 50 second reference:', text);
      }
      if (text?.includes('120') || text?.includes('2:00') || text?.includes('2 min')) {
        console.log('✅ Found 120 second / 2 minute reference:', text);
      }
    }
  } else {
    console.log('No timer elements found on keyword generator page');
  }
  
  // Also check analytics page
  await page.goto('http://localhost:3005/analytics');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/analytics-page.png', fullPage: true });
  
  const analyticsTimerElements = await page.locator('text=/\\d+\\s*(sec|second|min|minute)/i').all();
  
  if (analyticsTimerElements.length > 0) {
    console.log(`\nFound ${analyticsTimerElements.length} timer element(s) on analytics page:`);
    for (let i = 0; i < analyticsTimerElements.length; i++) {
      const text = await analyticsTimerElements[i].textContent();
      console.log(`  Analytics Timer ${i + 1}: "${text}"`);
    }
  } else {
    console.log('No timer elements found on analytics page');
  }
});