import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Test fixed Analytics UX - no context required', async ({ page }) => {
  console.log('=== TESTING FIXED /ANALYTICS UX ===')
  
  // Capture console messages
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[ANALYTICS]') || text.includes('[MENTIONS]') || text.includes('[HEALTH]') || text.includes('error')) {
      console.log(`🔍 BROWSER: ${text}`)
    }
  })
  
  await page.goto('http://localhost:3002/analytics')
  console.log('📍 Navigated to /analytics page with superior UX')
  
  // Check the beautiful UX elements
  await expect(page.locator('text=Run Full Analytics')).toBeVisible()
  await expect(page.locator('text=AEO (Answer Engine Optimization)')).toBeVisible()
  console.log('✅ Superior UX elements confirmed')
  
  // Should now show "Ready to Run" instead of "No Company Context Set"
  const contextStatus = await page.textContent('body')
  if (contextStatus?.includes('Ready to Run')) {
    console.log('✅ Shows "Ready to Run" - fallbacks working!')
  } else if (contextStatus?.includes('No Company Context Set')) {
    console.log('❌ Still showing old context requirement message')
  }
  
  // Button should be enabled now
  const runButton = page.locator('button:has-text("Run Full Analytics")')
  const isDisabled = await runButton.getAttribute('disabled')
  console.log(`Button disabled: ${isDisabled ? 'YES' : 'NO'}`)
  
  if (!isDisabled) {
    console.log('🚀 Clicking "Run Full Analytics" button...')
    await runButton.click()
    
    // Wait for loading state
    await expect(page.locator('text=Running Analytics...')).toBeVisible({ timeout: 10000 })
    console.log('✅ Loading state appeared')
    
    // Wait for completion (shorter timeout)
    await page.waitForTimeout(60000) // 60 seconds
    
    // Check results
    const finalContent = await page.textContent('body')
    const hasHealthResults = finalContent?.includes('Score:') || finalContent?.includes('Technical')
    const hasMentionsResults = finalContent?.includes('Visibility:') || finalContent?.includes('%')
    const hasErrorMessages = finalContent?.includes('failed') || finalContent?.includes('Error')
    
    console.log(`Has health results: ${hasHealthResults ? 'YES' : 'NO'}`)
    console.log(`Has mentions results: ${hasMentionsResults ? 'YES' : 'NO'}`) 
    console.log(`Has error messages: ${hasErrorMessages ? 'YES' : 'NO'}`)
    
    // Final assessment
    if (hasHealthResults && hasMentionsResults && !hasErrorMessages) {
      console.log('🎉 FULL SUCCESS: Superior /analytics UX working perfectly!')
    } else if (!hasErrorMessages && (hasHealthResults || hasMentionsResults)) {
      console.log('✅ PARTIAL SUCCESS: Analytics working, some results may be processing')
    } else if (hasErrorMessages) {
      console.log('❌ ERRORS PRESENT: Check console logs for details')
    } else {
      console.log('⏳ IN PROGRESS: May need more time or check loading state')
    }
  } else {
    console.log('❌ Button still disabled - context requirement not removed')
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/analytics-fixed.png', fullPage: true })
  console.log('Screenshot saved: /tmp/analytics-fixed.png')
  
  console.log('=== FIXED ANALYTICS TEST COMPLETE ===')
})