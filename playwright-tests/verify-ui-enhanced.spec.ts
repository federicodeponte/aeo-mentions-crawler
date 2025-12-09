import { test, expect } from '@playwright/test'

test('Verify Enhanced Mentions UI Results', async ({ page }) => {
  // Navigate to the page
  await page.goto('http://localhost:3002/aeo-analytics')
  
  // Fill in company name
  await page.fill('#mentions-company', 'SCAILE')
  
  // Click the Check Mentions button
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await expect(mentionsButton).toBeVisible()
  await mentionsButton.click()
  
  // Wait for the process to complete - increased timeout since we know it takes ~30s
  await page.waitForTimeout(45000)
  
  // Take a screenshot to see actual UI results
  await page.screenshot({ 
    path: '/tmp/ui-verification.png', 
    fullPage: true 
  })
  
  // Check for enhanced geography-aware patterns in the page content
  const pageContent = await page.content()
  
  // Look for enhanced queries that should be present
  const enhancedPatterns = [
    'comply with US data privacy laws',
    'US enterprise customers', 
    'ChatGPT for US',
    'Perplexity for US',
    'American',
    'US-based'
  ]
  
  let foundEnhanced = 0
  let foundOld = 0
  
  for (const pattern of enhancedPatterns) {
    if (pageContent.includes(pattern)) {
      console.log(`✅ Found enhanced pattern: "${pattern}"`)
      foundEnhanced++
    }
  }
  
  // Check for old generic patterns that should be minimal
  const oldPatterns = [
    'SCAILE vs alternatives',
    'SCAILE competitors',
    'best software tools'
  ]
  
  for (const pattern of oldPatterns) {
    if (pageContent.includes(pattern)) {
      console.log(`⚠️ Found old pattern: "${pattern}"`)
      foundOld++
    }
  }
  
  console.log(`Enhanced patterns found: ${foundEnhanced}`)
  console.log(`Old patterns found: ${foundOld}`)
  
  // We should find more enhanced patterns than old ones
  expect(foundEnhanced).toBeGreaterThan(foundOld)
  
  console.log('Screenshot saved to /tmp/ui-verification.png')
})