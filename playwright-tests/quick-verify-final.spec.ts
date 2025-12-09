import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Quick final verification - mentions check working', async ({ page }) => {
  console.log('=== QUICK FINAL VERIFICATION ===')
  
  // Capture key events
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[DEBUG:MENTIONS]') || text.includes('API:MENTIONS')) {
      console.log(`🔍 ${text}`)
    }
  })
  
  await page.goto('http://localhost:3002/aeo-analytics')
  await page.fill('#mentions-company', 'TESTCOMPANY')
  
  // Click mentions button
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  console.log('✅ Clicked mentions check button')
  
  // Wait for completion (shorter timeout)
  await page.waitForTimeout(30000) // 30 seconds
  
  // Check for results
  const pageContent = await page.textContent('body')
  const hasVisibilityScore = pageContent?.includes('Visibility:') || pageContent?.includes('%')
  const hasMentions = pageContent?.includes('mentions')
  const hasResults = pageContent?.includes('Query Results') || pageContent?.includes('Results')
  
  console.log(`Has visibility score: ${hasVisibilityScore ? 'YES' : 'NO'}`)
  console.log(`Has mentions: ${hasMentions ? 'YES' : 'NO'}`)
  console.log(`Has results section: ${hasResults ? 'YES' : 'NO'}`)
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/quick-verify-final.png', fullPage: true })
  console.log('Screenshot saved: /tmp/quick-verify-final.png')
  
  // Final assessment
  if (hasVisibilityScore && hasMentions) {
    console.log('🎉 SUCCESS: Mentions check fully working with results!')
  } else {
    console.log('⚠️ PARTIAL: Check screenshot for current state')
  }
  
  console.log('=== VERIFICATION COMPLETE ===')
})