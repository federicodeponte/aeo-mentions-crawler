import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Complete UI verification with query expansion', async ({ page }) => {
  await page.goto('http://localhost:3002/aeo-analytics')
  
  await page.fill('#mentions-company', 'SCAILE')
  
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  
  // Wait for results
  await page.waitForTimeout(35000)
  
  // Scroll down to see query results
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  
  // Take screenshot of the full results
  await page.screenshot({ path: '/tmp/ui-full-results.png', fullPage: true })
  
  // Try to expand any accordion items to see query details
  const accordionTriggers = page.locator('[data-radix-collection-item]')
  const count = await accordionTriggers.count()
  console.log(`Found ${count} accordion items`)
  
  if (count > 0) {
    // Click first few accordion items to expand them
    for (let i = 0; i < Math.min(3, count); i++) {
      try {
        await accordionTriggers.nth(i).click()
        await page.waitForTimeout(500)
      } catch (e) {
        console.log(`Could not expand accordion ${i}`)
      }
    }
    
    // Take screenshot after expansion
    await page.screenshot({ path: '/tmp/ui-expanded-results.png', fullPage: true })
  }
  
  const content = await page.content()
  
  // Look for enhanced queries in the actual UI
  const enhancedQueries = [
    'how to comply with US data privacy laws with ChatGPT for US-based companies',
    'how to target US enterprise customers with ChatGPT for US-based companies',
    'how to comply with US data privacy laws with Perplexity for US-based companies',
    'how to target US enterprise customers with Perplexity for US-based companies'
  ]
  
  const foundEnhanced = enhancedQueries.filter(query => content.includes(query))
  console.log('Complete enhanced queries found:', foundEnhanced)
  
  // Look for old patterns
  const oldQueries = [
    'SCAILE vs alternatives',
    'SCAILE competitors',
    'best software tools'
  ]
  
  const foundOld = oldQueries.filter(query => content.includes(query))
  console.log('Old query patterns found:', foundOld)
  
  console.log(`Screenshots saved:`)
  console.log('- Full results: /tmp/ui-full-results.png')
  console.log('- Expanded results: /tmp/ui-expanded-results.png')
  
  console.log('VERIFICATION COMPLETE')
})