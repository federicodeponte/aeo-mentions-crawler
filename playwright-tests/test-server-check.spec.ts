import { test, expect } from '@playwright/test'

test.setTimeout(60000) // 1 minute

test('Check if server is accessible and analytics page loads', async ({ page }) => {
  console.log('=== CHECKING SERVER ACCESSIBILITY ===')
  
  try {
    // Test basic server connectivity
    console.log('🔍 Testing http://localhost:3002...')
    await page.goto('http://localhost:3002')
    console.log('✅ Home page loads successfully')
    
    // Test analytics page specifically
    console.log('🔍 Testing http://localhost:3002/analytics...')
    await page.goto('http://localhost:3002/analytics')
    
    // Check for key elements
    const hasAnalyticsTitle = await page.locator('text=Run Analytics').count() > 0
    const hasRunButton = await page.locator('button:has-text("Run Full Analytics")').count() > 0
    const hasAEOSection = await page.locator('text=AEO (Answer Engine Optimization)').count() > 0
    
    console.log(`Analytics title present: ${hasAnalyticsTitle ? 'YES' : 'NO'}`)
    console.log(`Run button present: ${hasRunButton ? 'YES' : 'NO'}`)
    console.log(`AEO section present: ${hasAEOSection ? 'YES' : 'NO'}`)
    
    if (hasAnalyticsTitle && hasRunButton && hasAEOSection) {
      console.log('✅ Analytics page loads correctly!')
    } else {
      console.log('❌ Analytics page missing key elements')
    }
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/server-check.png', fullPage: true })
    console.log('📸 Screenshot saved: /tmp/server-check.png')
    
  } catch (error) {
    console.log(`❌ Error accessing server: ${error}`)
    
    // Try to take screenshot anyway
    try {
      await page.screenshot({ path: '/tmp/server-error.png', fullPage: true })
      console.log('📸 Error screenshot saved: /tmp/server-error.png')
    } catch (screenshotError) {
      console.log('❌ Could not take screenshot')
    }
  }
  
  console.log('=== SERVER CHECK COMPLETE ===')
})