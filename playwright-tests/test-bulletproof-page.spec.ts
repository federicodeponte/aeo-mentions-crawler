import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Test bulletproof analytics page', async ({ page }) => {
  console.log('=== TESTING BULLETPROOF PAGE ===')
  
  await page.goto('http://localhost:3002/test-analytics')
  await page.waitForTimeout(3000)
  
  console.log('✅ Bulletproof page loaded')
  
  // Check if page loaded correctly
  const pageTitle = await page.textContent('h1')
  console.log(`Page title: "${pageTitle}"`)
  
  // Look for the button
  const button = page.locator('button').filter({ hasText: /Run Full Analytics/i })
  const buttonExists = await button.count() > 0
  console.log(`Button exists: ${buttonExists}`)
  
  if (buttonExists) {
    const buttonText = await button.textContent()
    const isEnabled = await button.isEnabled()
    const isDisabled = await button.getAttribute('disabled')
    
    console.log(`Button text: "${buttonText}"`)
    console.log(`Button enabled: ${isEnabled}`)
    console.log(`Button disabled attr: ${isDisabled}`)
    
    if (isEnabled) {
      console.log('🎯 Attempting to click bulletproof button...')
      
      try {
        await button.click()
        console.log('✅ Bulletproof button clicked successfully!')
        
        // Wait for loading state
        await page.waitForTimeout(3000)
        const loadingText = await page.textContent('body')
        const hasLoading = loadingText?.includes('Running Analytics') || loadingText?.includes('⏳')
        
        console.log(`Loading state appeared: ${hasLoading}`)
        
        if (hasLoading) {
          console.log('✅ BULLETPROOF PAGE WORKS PERFECTLY!')
        } else {
          console.log('⚠️ Loading state not detected')
        }
        
      } catch (error) {
        console.log(`❌ Bulletproof button click failed: ${error}`)
      }
    } else {
      console.log('❌ BULLETPROOF BUTTON IS DISABLED!')
      
      // This would be very strange - let's debug
      const buttonHTML = await button.innerHTML()
      console.log(`Button HTML: ${buttonHTML}`)
      
      const buttonStyle = await button.getAttribute('style')
      console.log(`Button style: ${buttonStyle}`)
    }
  } else {
    console.log('❌ BULLETPROOF BUTTON NOT FOUND!')
    
    // Check what's on the page
    const bodyText = await page.textContent('body')
    console.log(`Page content preview: ${bodyText?.substring(0, 200)}...`)
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/bulletproof-test.png', fullPage: true })
  console.log('📸 Bulletproof test screenshot saved')
  
  console.log('=== BULLETPROOF TEST COMPLETE ===')
})