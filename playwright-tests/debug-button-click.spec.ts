import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Debug button click issue', async ({ page }) => {
  console.log('=== DEBUGGING BUTTON CLICK ISSUE ===')
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ BROWSER ERROR: ${msg.text()}`)
    }
  })
  
  // Capture network errors
  page.on('requestfailed', request => {
    console.log(`❌ NETWORK ERROR: ${request.url()} - ${request.failure()?.errorText}`)
  })
  
  await page.goto('http://localhost:3002/analytics')
  console.log('✅ Page loaded')
  
  // Wait for page to fully load
  await page.waitForTimeout(3000)
  
  // Check button state
  const runButton = page.locator('button:has-text("Run Full Analytics")')
  
  const buttonExists = await runButton.count() > 0
  console.log(`Button exists: ${buttonExists ? 'YES' : 'NO'}`)
  
  if (buttonExists) {
    const isVisible = await runButton.isVisible()
    const isEnabled = await runButton.isEnabled()
    const isDisabled = await runButton.getAttribute('disabled')
    
    console.log(`Button visible: ${isVisible ? 'YES' : 'NO'}`)
    console.log(`Button enabled: ${isEnabled ? 'YES' : 'NO'}`)
    console.log(`Button disabled attribute: ${isDisabled || 'NULL'}`)
    
    if (isVisible && isEnabled) {
      console.log('🚀 Attempting to click button...')
      try {
        await runButton.click()
        console.log('✅ Button clicked successfully')
        
        // Wait for any immediate response
        await page.waitForTimeout(5000)
        
        // Check if loading state appears
        const hasLoading = await page.locator('text=Running Analytics').count() > 0
        console.log(`Loading state appeared: ${hasLoading ? 'YES' : 'NO'}`)
        
      } catch (clickError) {
        console.log(`❌ Click failed: ${clickError}`)
      }
    } else {
      console.log('❌ Button not clickable - checking why...')
      
      // Check for any overlapping elements
      const buttonBox = await runButton.boundingBox()
      if (buttonBox) {
        console.log(`Button position: x=${buttonBox.x}, y=${buttonBox.y}, width=${buttonBox.width}, height=${buttonBox.height}`)
      }
    }
  } else {
    console.log('❌ Button not found - checking page content...')
    const pageText = await page.textContent('body')
    console.log('Page contains "Run Full Analytics":', pageText?.includes('Run Full Analytics') || false)
  }
  
  // Take screenshot for debugging
  await page.screenshot({ path: '/tmp/button-debug.png', fullPage: true })
  console.log('📸 Debug screenshot saved')
  
  console.log('=== DEBUG COMPLETE ===')
})