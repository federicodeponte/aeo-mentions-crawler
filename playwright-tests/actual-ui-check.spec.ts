import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Actual UI check - what user really sees', async ({ page }) => {
  console.log('Starting actual UI verification...')
  
  await page.goto('http://localhost:3002/aeo-analytics')
  await page.fill('#mentions-company', 'SCAILE')
  
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  
  console.log('Waiting for mentions check to complete...')
  
  // Wait for the results to load - look for actual content
  try {
    // Wait for mentions results to appear
    await page.waitForSelector('[data-testid="mentions-results"], .query-results, .accordion', { timeout: 90000 })
  } catch {
    console.log('No specific results selector found, waiting for general completion...')
    await page.waitForTimeout(45000)
  }
  
  // Scroll down to see query results section
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  
  // Take screenshot showing the query results area
  await page.screenshot({ path: '/tmp/actual-ui-results.png', fullPage: true })
  
  // Get all text content from the page
  const pageContent = await page.textContent('body')
  
  console.log('=== SEARCHING FOR ENHANCED QUERIES IN UI ===')
  
  // Check for the exact enhanced queries that should appear
  const enhancedQueries = [
    'how to comply with US data privacy laws with ChatGPT for US-based companies',
    'how to target US enterprise customers with ChatGPT for US-based companies', 
    'how to comply with US data privacy laws with Perplexity for US-based companies',
    'how to target US enterprise customers with Perplexity for US-based companies'
  ]
  
  let foundEnhancedQueries = 0
  for (const query of enhancedQueries) {
    if (pageContent?.includes(query)) {
      console.log(`✅ FOUND ENHANCED QUERY: "${query}"`)
      foundEnhancedQueries++
    } else {
      console.log(`❌ MISSING ENHANCED QUERY: "${query}"`)
    }
  }
  
  // Check for old queries that should be minimal
  const oldQueries = [
    'SCAILE vs alternatives',
    'SCAILE competitors',
    'best software tools 2024'
  ]
  
  let foundOldQueries = 0
  for (const query of oldQueries) {
    if (pageContent?.includes(query)) {
      console.log(`⚠️ FOUND OLD QUERY: "${query}"`)
      foundOldQueries++
    }
  }
  
  // Check for any query results at all
  const hasQueryResults = pageContent?.includes('Query Results') || pageContent?.includes('query') || pageContent?.includes('AI Response')
  console.log(`Has query results section: ${hasQueryResults}`)
  
  // Try to click accordion items to expand them
  console.log('Attempting to expand query result details...')
  const triggers = page.locator('[role="button"]:has-text("ChatGPT"), [role="button"]:has-text("Perplexity"), [role="button"]:has-text("Gemini")')
  const count = await triggers.count()
  console.log(`Found ${count} expandable result triggers`)
  
  if (count > 0) {
    // Click first few to expand
    for (let i = 0; i < Math.min(5, count); i++) {
      try {
        await triggers.nth(i).click()
        await page.waitForTimeout(1000)
        console.log(`Expanded result ${i + 1}`)
      } catch (e) {
        console.log(`Could not expand result ${i + 1}: ${e.message}`)
      }
    }
    
    // Take screenshot after expansion
    await page.screenshot({ path: '/tmp/expanded-ui-results.png', fullPage: true })
    
    // Check content again after expansion
    const expandedContent = await page.textContent('body')
    
    console.log('=== CHECKING EXPANDED CONTENT ===')
    for (const query of enhancedQueries) {
      if (expandedContent?.includes(query)) {
        console.log(`✅ FOUND IN EXPANDED: "${query}"`)
      }
    }
  }
  
  console.log(`\nSUMMARY:`)
  console.log(`Enhanced queries found: ${foundEnhancedQueries}`)
  console.log(`Old queries found: ${foundOldQueries}`)
  console.log(`Screenshots saved to:`)
  console.log(`- /tmp/actual-ui-results.png`)
  console.log(`- /tmp/expanded-ui-results.png`)
  
  // This test should not fail - just report what we found
  console.log(`\nVERIFICATION COMPLETE - Check screenshots for visual confirmation`)
})