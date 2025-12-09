import { test, expect } from '@playwright/test'

test.setTimeout(60000) // 1 minute

test('Test API key validation for mentions check', async ({ page }) => {
  console.log('=== TESTING API KEY VALIDATION ===')
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded...')
  
  // Fill in company name
  await page.fill('#mentions-company', 'TestCompany')
  console.log('Filled company name: TestCompany')
  
  // Try to submit mentions check without API key
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  console.log('Clicked mentions check button without API key...')
  
  // Wait a moment for any error to appear
  await page.waitForTimeout(2000)
  
  // Look for error message
  const errorMessage = page.locator('text=OpenRouter API key is required')
  const isErrorVisible = await errorMessage.isVisible()
  
  if (isErrorVisible) {
    console.log('✅ SUCCESS: API key validation is working!')
    const errorText = await errorMessage.textContent()
    console.log('Error message:', errorText)
  } else {
    console.log('❌ FAILURE: API key validation not working')
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/api-key-validation-test.png', fullPage: true })
  console.log('Screenshot saved: /tmp/api-key-validation-test.png')
  
  console.log('\\n=== API KEY VALIDATION TEST COMPLETE ===')
})