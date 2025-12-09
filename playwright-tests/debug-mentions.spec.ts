import { test, expect } from '@playwright/test'

test.setTimeout(120000)

test('Debug mentions API response', async ({ page }) => {
  console.log('Starting debug test...')
  
  // Go to page and trigger mentions check
  await page.goto('http://localhost:3002/aeo-analytics')
  await page.fill('#mentions-company', 'SCAILE')
  
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  await mentionsButton.click()
  
  console.log('Mentions check triggered, waiting for completion...')
  
  // Wait for the API call to complete 
  await page.waitForTimeout(35000)
  
  console.log('Debug test completed')
})