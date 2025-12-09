/**
 * Test script to verify analytics button works on local server
 */
const playwright = require('playwright');

async function testAnalyticsButtonLocal() {
    console.log('🧪 Testing analytics button on localhost:3002...');
    
    const browser = await playwright.chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Test analytics page
        console.log('\n📍 Navigating to analytics page...');
        await page.goto('http://localhost:3002/analytics', { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
        });
        
        await page.waitForTimeout(2000);
        
        // Check for all buttons
        const allButtons = await page.$$('button');
        console.log(`🔲 Found ${allButtons.length} total buttons on page`);
        
        // List all button text
        for (let i = 0; i < allButtons.length; i++) {
            const button = allButtons[i];
            const text = await button.textContent();
            const isDisabled = await button.isDisabled();
            console.log(`📋 Button ${i+1}: "${text}" - ${isDisabled ? 'DISABLED' : 'ENABLED'}`);
        }
        
        // Check for specific analytics buttons with different text variations
        const analyticsButtonSelectors = [
            'button:has-text("Run Full Analytics")',
            'button:has-text("Check Mentions")', 
            'button:has-text("Running")',
            'button:has-text("Analytics")',
            'button:has-text("AEO")'
        ];
        
        for (const selector of analyticsButtonSelectors) {
            const count = await page.locator(selector).count();
            if (count > 0) {
                console.log(`🎯 Found ${count} buttons matching "${selector}"`);
            }
        }
        
        // Check page title and URL
        const title = await page.title();
        const currentUrl = page.url();
        console.log(`📄 Page title: "${title}"`);
        console.log(`🔗 Current URL: "${currentUrl}"`);
        
        // Get page content preview
        const bodyText = await page.textContent('body');
        const contentPreview = bodyText.slice(0, 500).replace(/\s+/g, ' ');
        console.log(`📄 Page content preview: "${contentPreview}..."`);
        
        // Check for context messages
        const hasNoContext = bodyText.includes('No Company Context');
        const hasUsingContext = bodyText.includes('Using Company Context');
        const hasAnalytics = bodyText.includes('Analytics');
        const hasAEO = bodyText.includes('AEO');
        
        console.log(`🔍 "No Company Context" message: ${hasNoContext ? 'YES' : 'NO'}`);
        console.log(`🔍 "Using Company Context" message: ${hasUsingContext ? 'YES' : 'NO'}`);
        console.log(`🔍 Contains "Analytics": ${hasAnalytics ? 'YES' : 'NO'}`);
        console.log(`🔍 Contains "AEO": ${hasAEO ? 'YES' : 'NO'}`);
        
        // Check for any errors on page
        const errors = await page.evaluate(() => {
            const errors = [];
            // Check console errors
            if (window.console.error.toString().includes('native')) {
                errors.push('Console errors may be present');
            }
            return errors;
        });
        
        if (errors.length > 0) {
            console.log('⚠️ Page errors:', errors);
        }
        
        // Take screenshot
        await page.screenshot({ 
            path: '/tmp/analytics-localhost-test.png',
            fullPage: true 
        });
        console.log('📸 Screenshot saved to /tmp/analytics-localhost-test.png');
        
        console.log('\n✅ Analytics page test completed successfully');
        
    } catch (error) {
        console.error('❌ Error testing analytics page:', error.message);
    } finally {
        await browser.close();
    }
}

testAnalyticsButtonLocal().catch(console.error);