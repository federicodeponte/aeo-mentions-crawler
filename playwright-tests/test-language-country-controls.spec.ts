import { test, expect } from '@playwright/test'

test.setTimeout(60000) // 1 minute

test('Test language and country controls in AEO Analytics', async ({ page }) => {
  console.log('=== TESTING LANGUAGE & COUNTRY CONTROLS ===')
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded, testing language and country selectors...')
  
  // Wait for the page to fully load
  await page.waitForSelector('#mentions-company', { timeout: 10000 })
  
  // Check that language and country selectors are present
  const languageSelect = page.locator('text=Language').locator('..').locator('[role="combobox"]')
  const countrySelect = page.locator('text=Country').locator('..').locator('[role="combobox"]')
  
  // Verify selectors are visible
  await expect(languageSelect).toBeVisible()
  await expect(countrySelect).toBeVisible()
  console.log('✅ Language and country selectors are visible')
  
  // Test language selector
  await languageSelect.click()
  await page.waitForSelector('text=🇪🇸 Spanish', { timeout: 5000 })
  await page.click('text=🇪🇸 Spanish')
  console.log('✅ Language selector works - Spanish selected')
  
  // Test country selector
  await countrySelect.click()
  await page.waitForSelector('text=🇫🇷 France', { timeout: 5000 })
  await page.click('text=🇫🇷 France')
  console.log('✅ Country selector works - France selected')
  
  // Fill in company name
  await page.fill('#mentions-company', 'TestCompany')
  
  // Take a screenshot to verify the controls are working
  await page.screenshot({ path: '/tmp/language-country-controls.png', fullPage: true })
  console.log('Screenshot saved: /tmp/language-country-controls.png')
  
  // Verify the form is ready for submission
  const submitButton = page.locator('button:has-text("Check Mentions")')
  await expect(submitButton).toBeVisible()
  await expect(submitButton).not.toBeDisabled()
  
  console.log('✅ SUCCESS: Language and country controls are working correctly!')
  console.log('✅ Form is ready for submission with selected language (Spanish) and country (France)')
  
  console.log('\\n=== LANGUAGE & COUNTRY CONTROLS TEST COMPLETE ===')
})