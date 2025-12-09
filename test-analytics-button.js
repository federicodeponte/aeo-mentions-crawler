/**
 * Direct test script to verify the analytics button fix
 * Tests the deployed Vercel app to see if the button works correctly
 */
const playwright = require('playwright');

async function testAnalyticsButton() {
    console.log('🚀 Testing analytics button on Vercel deployment...');
    
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Test 1: Navigate to analytics page directly
        console.log('\n📍 Navigating to analytics page...');
        await page.goto('https://content-manager-8f6dcbqk7-federicodepontes-projects.vercel.app/analytics', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log('✅ Page loaded successfully');
        
        // Check if we can see any content on the page
        const title = await page.title();
        console.log(`📖 Page title: "${title}"`);
        
        // Take a screenshot to see what we actually get
        await page.screenshot({ 
            path: '/tmp/analytics-page-test.png',
            fullPage: true 
        });
        console.log('📸 Screenshot saved to /tmp/analytics-page-test.png');
        
        // Check for specific elements that should exist
        const buttons = await page.$$('button');
        console.log(`🔲 Found ${buttons.length} buttons on page`);
        
        // Look for the specific analytics button
        const analyticsButton = await page.locator('button:has-text("Run Full Analytics")').count();
        const analyticsButtonAlt = await page.locator('button:has-text("Check Mentions")').count();
        const analyticsButtonAlt2 = await page.locator('button:has-text("Running")').count();
        
        console.log(`🎯 "Run Full Analytics" buttons found: ${analyticsButton}`);
        console.log(`🎯 "Check Mentions" buttons found: ${analyticsButtonAlt}`);
        console.log(`🎯 "Running" buttons found: ${analyticsButtonAlt2}`);
        
        // Check for any error messages
        const errorText = await page.textContent('body');
        const hasNoContext = errorText.includes('No Company Context');
        const hasUsingContext = errorText.includes('Using Company Context');
        const hasAuthError = errorText.includes('401') || errorText.includes('Unauthorized') || errorText.includes('authentication');
        
        console.log(`🔍 Page shows "No Company Context": ${hasNoContext}`);
        console.log(`🔍 Page shows "Using Company Context": ${hasUsingContext}`);
        console.log(`🔍 Page has auth errors: ${hasAuthError}`);
        
        // Get a snippet of page content for debugging
        const bodyText = await page.textContent('body');
        const snippet = bodyText?.slice(0, 300) + '...';
        console.log(`📄 Page content preview: "${snippet}"`);
        
    } catch (error) {
        console.error('❌ Error testing analytics page:', error.message);
        
        // Try to get any error details from the page
        try {
            const errorDetails = await page.textContent('body');
            console.log('🔍 Error page content:', errorDetails?.slice(0, 500));
        } catch (e) {
            console.log('❌ Could not read error page content');
        }
    } finally {
        await browser.close();
    }
}

// Run the test
testAnalyticsButton().catch(console.error);