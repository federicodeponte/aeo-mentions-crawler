import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Check if UI updates after analytics completion', async ({ page }) => {
  console.log('=== CHECKING UI REFRESH AFTER ANALYTICS ===')
  
  await page.goto('http://localhost:3002/analytics')
  console.log('✅ Page loaded')
  
  // Click button
  const runButton = page.locator('button:has-text("Run Full Analytics")')
  await runButton.click()
  console.log('🚀 Button clicked')
  
  // Wait for completion (based on server logs, it takes about 30-40s)
  await page.waitForTimeout(50000) // 50 seconds
  console.log('⏳ Waited for completion')
  
  // Check if page shows results
  const pageContent = await page.textContent('body')
  
  const hasScore = pageContent?.includes('54') || pageContent?.includes('Score')
  const hasVisibility = pageContent?.includes('19.7') || pageContent?.includes('20.') || pageContent?.includes('Visibility')
  const hasAnyResults = pageContent?.includes('Technical') || pageContent?.includes('pass')
  
  console.log(`Page has score (54): ${hasScore ? 'YES' : 'NO'}`)
  console.log(`Page has visibility (19.7%): ${hasVisibility ? 'YES' : 'NO'}`)
  console.log(`Page has any results: ${hasAnyResults ? 'YES' : 'NO'}`)
  
  // Check button state
  const buttonText = await runButton.textContent()
  console.log(`Button text: "${buttonText}"`)
  
  // Force refresh to see if results appear
  await page.reload()
  await page.waitForTimeout(3000)
  
  const afterRefreshContent = await page.textContent('body')
  const hasResultsAfterRefresh = afterRefreshContent?.includes('54') || afterRefreshContent?.includes('Score')
  console.log(`Has results after refresh: ${hasResultsAfterRefresh ? 'YES' : 'NO'}`)
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/ui-refresh-check.png', fullPage: true })
  console.log('📸 Screenshot taken')
  
  console.log('=== UI REFRESH CHECK COMPLETE ===')
})