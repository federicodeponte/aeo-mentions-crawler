import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Test button behavior with vs without business context', async ({ page }) => {
  console.log('=== TESTING CONTEXT VS NO-CONTEXT BEHAVIOR ===')
  
  // Test 1: With business context (navigate to /context first to potentially set it)
  console.log('🔍 Testing with business context...')
  await page.goto('http://localhost:3002/context')
  await page.waitForTimeout(2000)
  
  // Now go to analytics
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(3000)
  
  // Check the context status
  const pageContent = await page.textContent('body')
  const hasContextData = pageContent?.includes('Using Company Context')
  const isReadyToRun = pageContent?.includes('Ready to Run')
  
  console.log(`Has context data: ${hasContextData ? 'YES' : 'NO'}`)
  console.log(`Shows "Ready to Run": ${isReadyToRun ? 'YES' : 'NO'}`)
  
  // Check button state
  const runButton = page.locator('button:has-text("Run Full Analytics")')
  const buttonExists = await runButton.count() > 0
  const isEnabled = buttonExists ? await runButton.isEnabled() : false
  const isDisabled = buttonExists ? await runButton.getAttribute('disabled') : 'not found'
  
  console.log(`Button exists: ${buttonExists ? 'YES' : 'NO'}`)
  console.log(`Button enabled: ${isEnabled ? 'YES' : 'NO'}`)  
  console.log(`Button disabled attr: ${isDisabled || 'NULL'}`)
  
  if (hasContextData) {
    console.log('📊 CONTEXT DETECTED - testing button click with context...')
    
    if (isEnabled) {
      try {
        await runButton.click()
        console.log('✅ Button clicked successfully with context')
        
        // Check if loading appears
        await page.waitForTimeout(5000)
        const hasLoading = await page.locator('text=Running Analytics').count() > 0
        console.log(`Loading appeared with context: ${hasLoading ? 'YES' : 'NO'}`)
        
      } catch (clickError) {
        console.log(`❌ Click failed with context: ${clickError}`)
      }
    } else {
      console.log('❌ Button disabled with context - this is the bug!')
    }
  } else {
    console.log('📝 NO CONTEXT - testing button click without context...')
    
    if (isEnabled) {
      try {
        await runButton.click()
        console.log('✅ Button clicked successfully without context')
        
        await page.waitForTimeout(5000)
        const hasLoading = await page.locator('text=Running Analytics').count() > 0
        console.log(`Loading appeared without context: ${hasLoading ? 'YES' : 'NO'}`)
        
      } catch (clickError) {
        console.log(`❌ Click failed without context: ${clickError}`)
      }
    }
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/context-comparison.png', fullPage: true })
  console.log('📸 Screenshot saved')
  
  console.log('=== CONTEXT COMPARISON TEST COMPLETE ===')
})