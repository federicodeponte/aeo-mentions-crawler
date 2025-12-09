import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Simple test - just check what queries are generated', async ({ page }) => {
  console.log('=== SIMPLE MENTIONS TEST ===')
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded...')
  
  // Fill in company name
  await page.fill('#mentions-company', 'Scaile')
  console.log('Filled company name: Scaile')
  
  // Trigger mentions check (will use default US/English)
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  console.log('Mentions check triggered, waiting 30s...')
  
  // Wait for the API call
  await page.waitForTimeout(30000)
  
  // Get page content and look for queries
  const pageContent = await page.textContent('body')
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/simple-mentions-test.png', fullPage: true })
  console.log('Screenshot saved: /tmp/simple-mentions-test.png')
  
  // Check for different types of queries
  const oldQueries = [
    'Scaile vs alternatives',
    'Scaile competitors',
    'best software tools 2024'
  ]
  
  const enhancedQueries = [
    'US-based companies',
    'ChatGPT for US',
    'Perplexity for US',
    'comply with US data privacy laws'
  ]
  
  console.log('\\n=== CHECKING QUERY TYPES ===')
  
  oldQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`❌ OLD QUERY: "${query}"`)
    }
  })
  
  enhancedQueries.forEach(query => {
    if (pageContent?.includes(query)) {
      console.log(`✅ ENHANCED QUERY: "${query}"`)
    }
  })
  
  console.log('\\n=== SIMPLE MENTIONS TEST COMPLETE ===')
})