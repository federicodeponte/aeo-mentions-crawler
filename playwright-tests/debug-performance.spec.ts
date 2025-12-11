import { test, expect } from '@playwright/test';

test('Debug performance issues - identify what is blocking', async ({ page }) => {
  console.log('🔍 Investigating what is causing long load times...');
  
  // Track network requests
  const requests = [];
  const responses = [];
  
  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      method: request.method(),
      startTime: Date.now()
    });
    console.log(`📤 Request: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', (response) => {
    const request = requests.find(r => r.url === response.url());
    if (request) {
      const duration = Date.now() - request.startTime;
      responses.push({
        url: response.url(),
        status: response.status(),
        duration
      });
      console.log(`📥 Response: ${response.status()} ${response.url()} (${duration}ms)`);
      
      if (duration > 3000) {
        console.log(`⚠️  SLOW REQUEST: ${response.url()} took ${duration}ms`);
      }
    }
  });
  
  // Track console logs and errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    } else if (msg.type() === 'warn') {
      console.log(`⚠️  Console Warning: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', (error) => {
    console.log(`💥 Page Error: ${error.message}`);
  });
  
  console.log('\n🏠 Testing homepage...');
  const homeStart = Date.now();
  
  try {
    await page.goto('http://localhost:3005', { 
      timeout: 15000,
      waitUntil: 'domcontentloaded' // Don't wait for networkidle 
    });
    console.log(`✅ Homepage DOMContentLoaded in ${Date.now() - homeStart}ms`);
    
    // Wait a bit more to see ongoing requests
    await page.waitForTimeout(5000);
    console.log(`ℹ️  After 5s wait: ${requests.length} requests made`);
    
  } catch (error) {
    console.log(`❌ Homepage failed to load: ${error.message}`);
  }
  
  console.log('\n🎯 Testing keyword generator page...');
  const keywordStart = Date.now();
  
  try {
    await page.goto('http://localhost:3005/go', { 
      timeout: 15000,
      waitUntil: 'domcontentloaded'
    });
    console.log(`✅ Keyword page DOMContentLoaded in ${Date.now() - keywordStart}ms`);
    
    // Wait for component to load
    await page.waitForTimeout(5000);
    console.log(`ℹ️  After 5s wait: Total ${requests.length} requests`);
    
  } catch (error) {
    console.log(`❌ Keyword page failed: ${error.message}`);
  }
  
  console.log('\n📊 Analytics page test...');
  const analyticsStart = Date.now();
  
  try {
    await page.goto('http://localhost:3005/analytics', { 
      timeout: 15000,
      waitUntil: 'domcontentloaded'
    });
    console.log(`✅ Analytics page DOMContentLoaded in ${Date.now() - analyticsStart}ms`);
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.log(`❌ Analytics page failed: ${error.message}`);
  }
  
  // Summary of slow requests
  const slowRequests = responses.filter(r => r.duration > 2000);
  if (slowRequests.length > 0) {
    console.log(`\n⚠️  SLOW REQUESTS (>2s):`);
    slowRequests.forEach(req => {
      console.log(`   ${req.status} ${req.url} - ${req.duration}ms`);
    });
  }
  
  // Check for pending requests
  const pendingRequests = requests.filter(req => 
    !responses.find(res => res.url === req.url)
  );
  
  if (pendingRequests.length > 0) {
    console.log(`\n⏳ PENDING REQUESTS (never completed):`);
    pendingRequests.forEach(req => {
      console.log(`   ${req.method} ${req.url} (started ${Date.now() - req.startTime}ms ago)`);
    });
  }
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total requests: ${requests.length}`);
  console.log(`   Completed responses: ${responses.length}`);
  console.log(`   Failed/pending: ${requests.length - responses.length}`);
  console.log(`   Requests >2s: ${slowRequests.length}`);
});

test('Simple page accessibility check', async ({ page }) => {
  console.log('\n🚀 Quick accessibility test...');
  
  // Just try to load pages with a short timeout to see basic responsiveness
  const pages = [
    { name: 'Homepage', url: 'http://localhost:3005' },
    { name: 'Keywords', url: 'http://localhost:3005/go' },
    { name: 'Analytics', url: 'http://localhost:3005/analytics' }
  ];
  
  for (const pageInfo of pages) {
    try {
      const start = Date.now();
      await page.goto(pageInfo.url, { timeout: 10000, waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - start;
      
      // Check if basic content exists
      const bodyText = await page.textContent('body');
      const hasContent = bodyText && bodyText.length > 100;
      
      console.log(`${hasContent ? '✅' : '❌'} ${pageInfo.name}: ${loadTime}ms, content: ${hasContent}`);
      
    } catch (error) {
      console.log(`❌ ${pageInfo.name}: FAILED - ${error.message}`);
    }
  }
});