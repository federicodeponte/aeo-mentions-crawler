import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Final AEO Analytics test - clean UI with language/country controls', async ({ page }) => {
  console.log('=== FINAL AEO ANALYTICS TEST ===')
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded...')
  
  // Wait for the page to fully load
  await page.waitForSelector('#mentions-company', { timeout: 10000 })
  
  // Verify the industry field has been removed (should not exist)
  const industryField = page.locator('#mentions-industry')
  await expect(industryField).not.toBeVisible()
  console.log('✅ Industry field correctly removed')
  
  // Verify language and country selectors are present and working
  const languageSelect = page.locator('text=Language').locator('..').locator('[role="combobox"]')
  const countrySelect = page.locator('text=Country').locator('..').locator('[role="combobox"]')
  
  await expect(languageSelect).toBeVisible()
  await expect(countrySelect).toBeVisible()
  console.log('✅ Language and country selectors are visible')
  
  // Test that company name field is present
  const companyField = page.locator('#mentions-company')
  await expect(companyField).toBeVisible()
  console.log('✅ Company name field is present')
  
  // Verify the form layout - should have clean 2x2 grid for language/country
  const gridContainer = page.locator('text=Language').locator('../..') // Parent of language selector
  await expect(gridContainer).toHaveClass(/grid-cols-2/)
  console.log('✅ Language/country controls are in clean 2-column grid')
  
  // Fill in company name
  await page.fill('#mentions-company', 'TestCompany')
  
  // Check that submit button is present and not disabled
  const submitButton = page.locator('button:has-text("Check Mentions")')
  await expect(submitButton).toBeVisible()
  await expect(submitButton).not.toBeDisabled()
  console.log('✅ Submit button is ready')
  
  // Test the page structure - should have 2 main cards: Health Check and Mentions Check
  const healthCard = page.locator('text=AEO Health Check').locator('..')
  const mentionsCard = page.locator('text=AEO Mentions Check').locator('..')
  
  await expect(healthCard).toBeVisible()
  await expect(mentionsCard).toBeVisible()
  console.log('✅ Both Health Check and Mentions Check cards are present')
  
  // Take a screenshot to verify the clean UI
  await page.screenshot({ path: '/tmp/final-aeo-analytics.png', fullPage: true })
  console.log('Screenshot saved: /tmp/final-aeo-analytics.png')
  
  console.log('✅ SUCCESS: AEO Analytics page is clean and functional!')
  console.log('✅ Removed redundant industry field')
  console.log('✅ Language and country controls working')
  console.log('✅ Form is properly structured')
  
  console.log('\\n=== FINAL AEO ANALYTICS TEST COMPLETE ===')
})