import { test, expect } from '@playwright/test'

test.setTimeout(300000) // 5 minutes for full E2E test

test('Real E2E test - enhanced geographic queries with env API keys', async ({ page }) => {
  console.log('=== REAL E2E TEST WITH ENV API KEYS ===')
  
  // Capture all console messages from the page
  const consoleMessages: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleMessages.push(text)
    
    // Log important messages immediately
    if (text.includes('Generated') || text.includes('queries') || text.includes('ENHANCE') || text.includes('DEBUG') || text.includes('API')) {
      console.log(`🔍 BROWSER: ${text}`)
    }
  })
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded...')
  
  // Fill in company name - use a generic company to trigger enhanced logic
  await page.fill('#mentions-company', 'TESTCOMPANY')
  console.log('Filled company name: TESTCOMPANY')
  
  // Trigger mentions check (should work with env API keys)
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  console.log('🚀 Mentions check triggered with env API keys, waiting for completion...')
  
  // Wait for the API call to complete 
  await page.waitForTimeout(60000) // 1 minute
  
  console.log('=== ANALYZING RESULTS ===')
  
  // Check page content for query types
  const pageContent = await page.textContent('body')
  
  // Old basic queries we DON'T want to see
  const oldQueries = [
    'TESTCOMPANY vs alternatives',
    'TESTCOMPANY competitors', 
    'best software tools 2024',
    'TESTCOMPANY software'
  ]
  
  // Enhanced geographic queries we DO want to see
  const enhancedQueries = [
    'US-based companies',
    'ChatGPT for US',
    'Perplexity for US', 
    'comply with US data privacy laws',
    'target US enterprise customers'
  ]
  
  console.log('\\n=== CHECKING FOR QUERY TYPES ===')
  
  let foundOld = 0
  let foundEnhanced = 0
  
  oldQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`❌ FOUND OLD BASIC QUERY: "${query}"`)
      foundOld++
    }
  })
  
  enhancedQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`✅ FOUND ENHANCED QUERY: "${query}"`)
      foundEnhanced++
    }
  })
  
  // Check for results section
  const hasResults = pageContent?.includes('Query Results') || pageContent?.includes('Visibility:') || pageContent?.includes('mentions')
  
  console.log(`\\nSUMMARY:`)
  console.log(`Old basic queries found: ${foundOld}`)
  console.log(`Enhanced geographic queries found: ${foundEnhanced}`)
  console.log(`Has results section: ${hasResults ? 'YES' : 'NO'}`)
  
  // Take screenshot for verification
  await page.screenshot({ path: '/tmp/real-e2e-test.png', fullPage: true })
  console.log(`Screenshot saved: /tmp/real-e2e-test.png`)
  
  // Final assessment
  if (foundEnhanced > 0) {
    console.log('✅ SUCCESS: Enhanced geographic targeting queries are working!')
  } else if (foundOld > 0) {
    console.log('❌ FAILURE: Still showing old basic queries, enhanced targeting not working')
  } else if (!hasResults) {
    console.log('⚠️ NO RESULTS: Mentions check may have failed or is still processing')
  } else {
    console.log('🔍 UNCLEAR: Check screenshot for actual state')
  }
  
  console.log('\\n=== REAL E2E TEST FINISHED ===')
})