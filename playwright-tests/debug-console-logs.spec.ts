import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Debug console logs - actual queries in UI', async ({ page }) => {
  console.log('=== STARTING CONSOLE DEBUG TEST ===')
  
  // Capture all console messages from the page
  const consoleMessages: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleMessages.push(text)
    
    // Log debug messages immediately
    if (text.includes('[DEBUG]') || text.includes('ALL QUERIES')) {
      console.log(`🔍 BROWSER DEBUG: ${text}`)
    }
  })
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded, filling form...')
  
  await page.fill('#mentions-company', 'SCAILE')
  
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  console.log('Mentions check triggered, waiting for completion...')
  
  // Wait for the API call to complete 
  await page.waitForTimeout(45000)
  
  console.log('=== ANALYZING CONSOLE MESSAGES ===')
  
  // Filter and analyze debug messages
  const debugMessages = consoleMessages.filter(msg => 
    msg.includes('[DEBUG]') || 
    msg.includes('ALL QUERIES') || 
    msg.includes('Query results count') ||
    msg.includes('Mentions API response')
  )
  
  console.log(`Found ${debugMessages.length} debug messages:`)
  debugMessages.forEach((msg, idx) => {
    console.log(`${idx + 1}. ${msg}`)
  })
  
  // Look for the specific queries in console logs
  const queryMessages = consoleMessages.filter(msg => 
    msg.includes('how to comply with US data privacy laws') ||
    msg.includes('US enterprise customers') ||
    msg.includes('ChatGPT for US') ||
    msg.includes('Perplexity for US') ||
    msg.includes('SCAILE vs alternatives')
  )
  
  console.log(`\nFound ${queryMessages.length} query-related messages:`)
  queryMessages.forEach((msg, idx) => {
    console.log(`${idx + 1}. ${msg}`)
  })
  
  // Check page content for the queries
  const pageContent = await page.textContent('body')
  
  const enhancedQueries = [
    'how to comply with US data privacy laws with ChatGPT for US-based companies',
    'how to target US enterprise customers with ChatGPT for US-based companies',
    'how to comply with US data privacy laws with Perplexity for US-based companies',
    'how to target US enterprise customers with Perplexity for US-based companies'
  ]
  
  const oldQueries = [
    'SCAILE vs alternatives',
    'SCAILE competitors',
    'best software tools 2024'
  ]
  
  console.log('\n=== CHECKING PAGE CONTENT FOR QUERIES ===')
  
  let foundEnhanced = 0
  let foundOld = 0
  
  enhancedQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`✅ FOUND ENHANCED IN UI: "${query}"`)
      foundEnhanced++
    } else {
      console.log(`❌ MISSING ENHANCED IN UI: "${query}"`)
    }
  })
  
  oldQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`⚠️ FOUND OLD IN UI: "${query}"`)
      foundOld++
    }
  })
  
  console.log(`\nSUMMARY:`)
  console.log(`Enhanced queries in UI: ${foundEnhanced}`)
  console.log(`Old queries in UI: ${foundOld}`)
  
  // Take screenshot for manual verification
  await page.screenshot({ path: '/tmp/debug-console-verification.png', fullPage: true })
  console.log(`Screenshot saved: /tmp/debug-console-verification.png`)
  
  console.log('\n=== DEBUG TEST COMPLETE ===')
})