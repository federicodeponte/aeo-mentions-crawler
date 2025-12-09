import { test, expect } from '@playwright/test'

test.setTimeout(300000) // 5 minutes for full E2E test

test('Full E2E test - mentions check with fallback products', async ({ page }) => {
  console.log('=== FULL E2E MENTIONS CHECK TEST ===')
  
  // Capture all console messages from the page
  const consoleMessages: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleMessages.push(text)
    
    // Log important messages immediately
    if (text.includes('Generated') || text.includes('API:MENTIONS') || text.includes('DEBUG:MENTIONS') || text.includes('error') || text.includes('Error')) {
      console.log(`🔍 BROWSER: ${text}`)
    }
  })
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded...')
  
  // Fill in company name
  await page.fill('#mentions-company', 'TESTCOMPANY')
  console.log('Filled company name: TESTCOMPANY')
  
  // Verify UI state before clicking
  const errorBadgeBefore = page.locator('.bg-red-500, .text-red-500').filter({ hasText: 'error' })
  const errorCountBefore = await errorBadgeBefore.count()
  console.log(`Errors visible before click: ${errorCountBefore}`)
  
  // Trigger mentions check
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await expect(mentionsButton).toBeVisible()
  console.log('🚀 Clicking mentions check button...')
  await mentionsButton.click()
  
  // Wait for loading state to appear
  console.log('⏳ Waiting for loading state...')
  await expect(page.locator('text=Processing')).toBeVisible({ timeout: 5000 }).catch(() => {
    console.log('Loading state not found, continuing...')
  })
  
  // Wait for the mentions check to complete (or timeout after 60 seconds)
  console.log('⏳ Waiting for mentions check to complete...')
  await page.waitForTimeout(60000) // 60 seconds
  
  console.log('=== ANALYZING RESULTS ===')
  
  // Check if there are any error messages visible
  const errorBadgeAfter = page.locator('.bg-red-500, .text-red-500').filter({ hasText: 'error' })
  const errorCountAfter = await errorBadgeAfter.count()
  console.log(`Errors visible after click: ${errorCountAfter}`)
  
  // Check for results section
  const resultsSection = page.locator('text=Query Results, text=Visibility:, text=mentions')
  const hasResults = await resultsSection.count() > 0
  console.log(`Has results section: ${hasResults ? 'YES' : 'NO'}`)
  
  // Check for loading state (should be gone)
  const stillLoading = await page.locator('text=Processing').count()
  console.log(`Still in loading state: ${stillLoading > 0 ? 'YES' : 'NO'}`)
  
  // Check page content for specific enhanced queries
  const pageContent = await page.textContent('body')
  
  // Enhanced geographic queries we should see
  const enhancedQueries = [
    'US-based companies',
    'ChatGPT for US',
    'Perplexity for US', 
    'comply with US data privacy laws',
    'target US enterprise customers'
  ]
  
  console.log('\\n=== CHECKING FOR ENHANCED QUERIES ===')
  let foundEnhanced = 0
  enhancedQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`✅ FOUND ENHANCED QUERY: "${query}"`)
      foundEnhanced++
    } else {
      console.log(`❌ NOT FOUND: "${query}"`)
    }
  })
  
  // Check debug logs for key events
  const debugLogs = consoleMessages.filter(msg => msg.includes('[DEBUG:MENTIONS]'))
  console.log(`\\n=== DEBUG LOG SUMMARY ===`)
  console.log(`Total debug messages: ${debugLogs.length}`)
  
  const buttonClicked = consoleMessages.some(msg => msg.includes('🚀 Mentions check button clicked'))
  const fallbackGenerated = consoleMessages.some(msg => msg.includes('Generated generic products'))
  const validationPassed = consoleMessages.some(msg => msg.includes('✅ Validation passed'))
  const apiCallMade = consoleMessages.some(msg => msg.includes('📡 Making fetch request'))
  const enhancementApplied = consoleMessages.some(msg => msg.includes('Enhanced pain points with geographic targeting'))
  
  console.log(`Button clicked: ${buttonClicked ? 'YES' : 'NO'}`)
  console.log(`Fallback products generated: ${fallbackGenerated ? 'YES' : 'NO'}`)
  console.log(`Validation passed: ${validationPassed ? 'YES' : 'NO'}`)
  console.log(`API call made: ${apiCallMade ? 'YES' : 'NO'}`)
  console.log(`Geographic enhancement applied: ${enhancementApplied ? 'YES' : 'NO'}`)
  
  // Check for any JavaScript errors
  const jsErrors = consoleMessages.filter(msg => 
    msg.toLowerCase().includes('error') && 
    !msg.includes('[DEBUG:MENTIONS]') &&
    !msg.includes('Failed to load resource') && // Ignore 401s from auth
    !msg.includes('Failed to load usage stats')
  )
  console.log(`\\nJavaScript errors found: ${jsErrors.length}`)
  jsErrors.forEach((error, index) => {
    console.log(`JS Error ${index + 1}: ${error}`)
  })
  
  // Take screenshot for verification
  await page.screenshot({ path: '/tmp/e2e-mentions-full.png', fullPage: true })
  console.log(`Screenshot saved: /tmp/e2e-mentions-full.png`)
  
  // Final assessment
  console.log('\\n=== FINAL ASSESSMENT ===')
  
  if (errorCountAfter > errorCountBefore) {
    console.log('❌ FAILURE: More errors appeared after clicking button')
  } else if (!buttonClicked) {
    console.log('❌ FAILURE: Button click not detected')
  } else if (!fallbackGenerated) {
    console.log('❌ FAILURE: Fallback products not generated')
  } else if (!validationPassed) {
    console.log('❌ FAILURE: Validation failed')
  } else if (!apiCallMade) {
    console.log('❌ FAILURE: API call not made')
  } else if (jsErrors.length > 0) {
    console.log(`❌ FAILURE: JavaScript errors present (${jsErrors.length})`)
  } else if (stillLoading > 0) {
    console.log('⚠️ TIMEOUT: Still in loading state (API may be slow/failing)') 
  } else if (foundEnhanced > 0 && hasResults) {
    console.log('✅ SUCCESS: Enhanced geographic targeting working with results!')
  } else if (hasResults) {
    console.log('✅ PARTIAL SUCCESS: Mentions check working, but enhanced queries not visible in UI')
  } else {
    console.log('⚠️ INCOMPLETE: API call made but no results visible (check API response)')
  }
  
  console.log('\\n=== FULL E2E TEST FINISHED ===')
})