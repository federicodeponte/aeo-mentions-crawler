import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Test Scaile (real company) - enhanced geographic targeting', async ({ page }) => {
  console.log('=== TESTING SCAILE (REAL COMPANY) ===')
  
  // Capture all console messages from the page
  const consoleMessages: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleMessages.push(text)
    
    // Log debug messages immediately
    if (text.includes('[DEBUG]') || text.includes('[ENHANCE]')) {
      console.log(`🔍 BROWSER DEBUG: ${text}`)
    }
  })
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded, testing real company...')
  
  // Test with "Scaile" (real company that has existing pain points)
  await page.fill('#mentions-company', 'Scaile')
  
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  console.log('Mentions check triggered for Scaile (real company), waiting for completion...')
  
  // Wait for the API call to complete 
  await page.waitForTimeout(45000)
  
  console.log('=== ANALYZING CONSOLE MESSAGES ===')
  
  // Filter and analyze debug messages
  const debugMessages = consoleMessages.filter(msg => 
    msg.includes('[DEBUG]') || 
    msg.includes('[ENHANCE]') || 
    msg.includes('Enhanced pain points with geographic targeting') ||
    msg.includes('Existing pain points found')
  )
  
  console.log(`Found ${debugMessages.length} debug messages:`)
  debugMessages.forEach((msg, idx) => {
    console.log(`${idx + 1}. ${msg}`)
  })
  
  // Check page content for the enhanced queries
  const pageContent = await page.textContent('body')
  
  const enhancedQueries = [
    'how to comply with US data privacy laws with ChatGPT for US-based companies',
    'how to target US enterprise customers with ChatGPT for US-based companies', 
    'how to comply with US data privacy laws with Perplexity for US-based companies',
    'how to target US enterprise customers with Perplexity for US-based companies'
  ]
  
  const oldQueries = [
    'Scaile vs alternatives',
    'Scaile competitors',
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
  await page.screenshot({ path: '/tmp/scaile-real-company-verification.png', fullPage: true })
  console.log(`Screenshot saved: /tmp/scaile-real-company-verification.png`)
  
  // Verify we have at least some enhanced queries working
  if (foundEnhanced > 0) {
    console.log('✅ SUCCESS: Enhanced geographic targeting is working for real companies!')
  } else {
    console.log('❌ FAILURE: No enhanced queries found in UI for real companies')
  }
  
  console.log('\n=== SCAILE REAL COMPANY TEST COMPLETE ===')
})