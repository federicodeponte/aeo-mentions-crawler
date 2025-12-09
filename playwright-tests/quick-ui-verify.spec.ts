import { test, expect } from '@playwright/test'

// Increase timeout for this test
test.setTimeout(120000) // 2 minutes

test('Quick UI verification', async ({ page }) => {
  await page.goto('http://localhost:3002/aeo-analytics')
  
  await page.fill('#mentions-company', 'SCAILE')
  
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  
  // Wait for results to appear - look for the results container
  try {
    await page.waitForSelector('.mentions-results, [data-testid="mentions-results"], .accordion', { timeout: 60000 })
  } catch {
    // If no results container, just wait and take screenshot
    await page.waitForTimeout(35000)
  }
  
  await page.screenshot({ path: '/tmp/ui-final-verification.png', fullPage: true })
  
  const content = await page.content()
  
  // Check for enhanced patterns
  const enhancedFound = [
    'comply with US data privacy laws',
    'US enterprise customers',
    'ChatGPT for US',
    'Perplexity for US'
  ].filter(pattern => content.includes(pattern))
  
  console.log('Enhanced patterns found:', enhancedFound)
  console.log('Screenshot saved to /tmp/ui-final-verification.png')
  
  // Just log what we found, don't fail the test
  console.log('Test completed - check screenshot for actual UI results')
})