const { chromium } = require('playwright');

async function testServerAccess() {
  console.log('🌐 Testing server access...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test home page
    console.log('📱 Testing http://localhost:3010');
    await page.goto('http://localhost:3010', { waitUntil: 'networkidle', timeout: 10000 });
    
    const title = await page.title();
    console.log(`   ✅ Home page loaded: ${title}`);
    
    // Take screenshot of home page
    await page.screenshot({ path: 'home-page-test.png', fullPage: true });
    console.log('   📸 Screenshot saved as home-page-test.png');
    
    // Test direct blogs path without authentication  
    console.log('📱 Testing direct blogs access...');
    const response = await page.goto('http://localhost:3010/blogs', { timeout: 10000 });
    console.log(`   Response status: ${response.status()}`);
    
    if (response.status() === 404) {
      console.log('   ⚠️  /blogs returns 404 (expected if auth required)');
    }
    
    // Check if there's an auth page or redirect
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('auth')) {
      console.log('   🔐 Redirected to auth page (authentication required)');
    }
    
    // Take screenshot of whatever page we're on
    await page.screenshot({ path: 'blogs-access-test.png', fullPage: true });
    console.log('   📸 Screenshot saved as blogs-access-test.png');
    
  } catch (error) {
    console.error('❌ Server access failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
  
  return true;
}

testServerAccess().then(() => {
  console.log('✅ Server access test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});