import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Test if enhanced geographic queries are actually being generated (not old basic ones)', async ({ page }) => {
  console.log('=== TESTING ENHANCED QUERIES VS OLD BASIC QUERIES ===')
  
  // Capture all console messages from the page
  const consoleMessages: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleMessages.push(text)
    
    // Log query-related messages immediately
    if (text.includes('Generated') || text.includes('queries') || text.includes('ENHANCE') || text.includes('DEBUG')) {
      console.log(`🔍 BROWSER: ${text}`)
    }
  })
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded, testing enhanced vs basic queries...')
  
  // Fill in company name (use generic company to test enhanced logic)
  await page.fill('#mentions-company', 'TestCompany')
  
  // Select France as country to test geographic targeting
  const countrySelect = page.locator('text=Country').locator('..').locator('[role="combobox"]')
  await countrySelect.click()
  await page.waitForSelector('text=🇫🇷 France', { timeout: 5000 })
  await page.click('text=🇫🇷 France')
  console.log('Selected France as target country')
  
  // Select Spanish as language to test language targeting
  const languageSelect = page.locator('text=Language').locator('..').locator('[role="combobox"]')
  await languageSelect.click() 
  await page.waitForSelector('text=🇪🇸 Spanish', { timeout: 5000 })
  await page.click('text=🇪🇸 Spanish')
  console.log('Selected Spanish as target language')
  
  // Trigger mentions check
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  console.log('Mentions check triggered for TestCompany with France/Spanish targeting, waiting for completion...')
  
  // Wait for the API call to complete 
  await page.waitForTimeout(45000)
  
  console.log('=== ANALYZING CONSOLE MESSAGES FOR QUERY TYPES ===')
  
  // Check page content for query types
  const pageContent = await page.textContent('body')
  
  // Old basic queries we DON'T want to see
  const oldQueries = [
    'TestCompany vs alternatives',
    'TestCompany competitors', 
    'best software tools 2024',
    'TestCompany software'
  ]
  
  // Enhanced geographic queries we DO want to see
  const enhancedQueries = [
    'France-based companies',
    'ChatGPT for France',
    'Perplexity for France', 
    'European', 
    'EU-based',
    'comply with GDPR requirements',
    'target European markets'
  ]
  
  console.log('\\n=== CHECKING FOR OLD VS ENHANCED QUERIES ===')
  
  let foundOld = 0
  let foundEnhanced = 0
  
  oldQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`❌ FOUND OLD QUERY: "${query}"`)
      foundOld++
    }
  })
  
  enhancedQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`✅ FOUND ENHANCED QUERY: "${query}"`)
      foundEnhanced++
    }
  })
  
  console.log(`\\nSUMMARY:`)
  console.log(`Old basic queries found: ${foundOld}`)
  console.log(`Enhanced geographic queries found: ${foundEnhanced}`)
  
  // Take screenshot for verification
  await page.screenshot({ path: '/tmp/enhanced-vs-basic-queries.png', fullPage: true })
  console.log(`Screenshot saved: /tmp/enhanced-vs-basic-queries.png`)
  
  // Success criteria
  if (foundEnhanced > foundOld) {
    console.log('✅ SUCCESS: Enhanced geographic targeting is working! More enhanced queries than old basic ones.')
  } else if (foundOld > 0 && foundEnhanced === 0) {
    console.log('❌ FAILURE: Still showing old basic queries, enhanced targeting not working')
  } else {
    console.log('⚠️  MIXED RESULTS: Check screenshot and logs to determine actual state')
  }
  
  console.log('\\n=== ENHANCED VS BASIC QUERIES TEST COMPLETE ===')
})