import { test, expect } from '@playwright/test'

test.setTimeout(300000) // 5 minutes

test('Debug mentions API call flow', async ({ page }) => {
  console.log('=== DEBUG MENTIONS API CALL FLOW ===')
  
  // Capture all console messages from the page
  const consoleMessages: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleMessages.push(text)
    
    // Log ALL messages to see what's happening
    console.log(`🔍 BROWSER: ${text}`)
  })
  
  await page.goto('http://localhost:3002/aeo-analytics')
  console.log('Page loaded...')
  
  // Fill in company name
  await page.fill('#mentions-company', 'TESTCOMPANY')
  console.log('Filled company name: TESTCOMPANY')
  
  // Trigger mentions check
  const mentionsButton = page.locator('button:has-text("Check Mentions")')
  console.log('🚀 Clicking mentions check button...')
  await mentionsButton.click()
  
  // Wait a bit for the API call to be made
  await page.waitForTimeout(30000) // 30 seconds
  
  console.log('=== ANALYZING DEBUG LOGS ===')
  
  const debugLogs = consoleMessages.filter(msg => msg.includes('[DEBUG:MENTIONS]'))
  console.log(`Found ${debugLogs.length} debug messages:`)
  debugLogs.forEach((log, index) => {
    console.log(`${index + 1}. ${log}`)
  })
  
  // Check if the button click was detected
  const buttonClickDetected = consoleMessages.some(msg => 
    msg.includes('[DEBUG:MENTIONS] 🚀 Mentions check button clicked'))
  console.log(`Button click detected: ${buttonClickDetected ? 'YES' : 'NO'}`)
  
  // Check if API call was made
  const apiCallMade = consoleMessages.some(msg => 
    msg.includes('[DEBUG:MENTIONS] 📡 Making fetch request'))
  console.log(`API call made: ${apiCallMade ? 'YES' : 'NO'}`)
  
  // Check for any errors
  const errorMessages = consoleMessages.filter(msg => 
    msg.toLowerCase().includes('error') || msg.includes('❌'))
  console.log(`Error messages found: ${errorMessages.length}`)
  errorMessages.forEach((error, index) => {
    console.log(`Error ${index + 1}: ${error}`)
  })
  
  // Take screenshot for verification
  await page.screenshot({ path: '/tmp/debug-mentions-api.png', fullPage: true })
  console.log(`Screenshot saved: /tmp/debug-mentions-api.png`)
  
  console.log('=== DEBUG TEST FINISHED ===')
})