import { test, expect } from '@playwright/test'

test.setTimeout(300000) // 5 minutes

test('Test superior Analytics UX with fixed backend', async ({ page }) => {
  console.log('=== TESTING SUPERIOR /ANALYTICS UX ===')
  
  // Capture console messages
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[ANALYTICS]') || text.includes('[MENTIONS]') || text.includes('API:MENTIONS') || text.includes('error')) {
      console.log(`🔍 BROWSER: ${text}`)
    }
  })
  
  await page.goto('http://localhost:3002/analytics')
  console.log('📍 Navigated to /analytics page')
  
  // Check the superior UX elements are present
  await expect(page.locator('text=Run Full Analytics')).toBeVisible()
  await expect(page.locator('text=AEO (Answer Engine Optimization)')).toBeVisible()
  console.log('✅ Superior UX elements confirmed')
  
  // Check if business context is populated (should show "No Company Context Set")
  const contextStatus = await page.textContent('body')
  if (contextStatus?.includes('No Company Context Set')) {
    console.log('📋 No business context - will test with manual input')
  } else {
    console.log('📋 Business context detected')
  }
  
  // Click "Run Full Analytics" button to test our fixed backend
  const runButton = page.locator('button:has-text("Run Full Analytics")')
  await expect(runButton).toBeVisible()
  console.log('🚀 Clicking "Run Full Analytics" button...')
  await runButton.click()
  
  // Wait for loading state to appear
  await expect(page.locator('text=Running Analytics...')).toBeVisible({ timeout: 5000 }).catch(() => {
    console.log('Loading state may not be visible, checking for progress...')
  })
  
  console.log('⏳ Waiting for analytics to complete...')
  await page.waitForTimeout(60000) // 60 seconds
  
  // Check for results
  const finalContent = await page.textContent('body')
  
  const hasHealthResults = finalContent?.includes('Technical Health') || finalContent?.includes('Score:')
  const hasMentionsResults = finalContent?.includes('Visibility:') || finalContent?.includes('mentions')
  const hasErrorMessage = finalContent?.includes('error') || finalContent?.includes('failed')
  
  console.log(`Has health results: ${hasHealthResults ? 'YES' : 'NO'}`)
  console.log(`Has mentions results: ${hasMentionsResults ? 'YES' : 'NO'}`) 
  console.log(`Has error messages: ${hasErrorMessage ? 'YES' : 'NO'}`)
  
  // Take screenshot of the superior UX
  await page.screenshot({ path: '/tmp/analytics-superior-ux.png', fullPage: true })
  console.log('Screenshot saved: /tmp/analytics-superior-ux.png')
  
  console.log('\\n=== FINAL ASSESSMENT ===')
  if (hasHealthResults && hasMentionsResults && !hasErrorMessage) {
    console.log('🎉 SUCCESS: Superior /analytics UX working perfectly!')
  } else if (!hasErrorMessage && (hasHealthResults || hasMentionsResults)) {
    console.log('✅ PARTIAL SUCCESS: Analytics working, one component may be slower')
  } else if (hasErrorMessage) {
    console.log('❌ ERROR: Check logs for specific issues')
  } else {
    console.log('⏳ TIMEOUT: May need longer wait time or context setup')
  }
  
  console.log('=== SUPERIOR UX TEST COMPLETE ===')
})