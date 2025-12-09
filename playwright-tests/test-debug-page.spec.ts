import { test, expect } from '@playwright/test'

test.setTimeout(120000)

test('Test debug page functionality', async ({ page }) => {
  console.log('=== TESTING DEBUG PAGE ===')
  
  // Go to debug page
  await page.goto('http://localhost:3002/debug')
  await page.waitForTimeout(3000)
  
  console.log('✅ Debug page loaded')
  
  // Check page content
  const pageTitle = await page.locator('h1').textContent()
  console.log(`Page title: "${pageTitle}"`)
  
  // Test basic click button
  console.log('\n🟢 Testing basic click button...')
  
  page.on('dialog', dialog => {
    console.log(`Alert appeared: "${dialog.message()}"`)
    dialog.accept()
  })
  
  const basicButton = page.locator('button:has-text("Test Basic Click")')
  const basicExists = await basicButton.count() > 0
  const basicEnabled = basicExists ? await basicButton.isEnabled() : false
  
  console.log(`Basic button exists: ${basicExists}`)
  console.log(`Basic button enabled: ${basicEnabled}`)
  
  if (basicExists && basicEnabled) {
    await basicButton.click()
    console.log('✅ Basic button clicked')
    await page.waitForTimeout(1000)
  }
  
  // Test API fetch button  
  console.log('\n🔵 Testing API fetch button...')
  const apiButton = page.locator('button:has-text("Test API Fetch")')
  const apiExists = await apiButton.count() > 0
  const apiEnabled = apiExists ? await apiButton.isEnabled() : false
  
  console.log(`API button exists: ${apiExists}`)
  console.log(`API button enabled: ${apiEnabled}`)
  
  if (apiExists && apiEnabled) {
    await apiButton.click()
    console.log('✅ API button clicked')
    await page.waitForTimeout(5000) // Wait for API call
  }
  
  // Check browser info
  console.log('\n🔍 Getting browser info...')
  const browserInfo = await page.evaluate(() => {
    return {
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      storageAvailable: typeof Storage !== 'undefined',
      jsEnabled: true
    }
  })
  
  console.log('Browser info:', JSON.stringify(browserInfo, null, 2))
  
  // Check console for any errors
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
    console.log(`Console ${msg.type()}: ${msg.text()}`)
  })
  
  await page.waitForTimeout(2000)
  
  if (errors.length > 0) {
    console.log('\n❌ Console errors found:')
    errors.forEach((error, i) => {
      console.log(`  ${i + 1}: ${error}`)
    })
  } else {
    console.log('\n✅ No console errors detected')
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/debug-page-test.png', fullPage: true })
  console.log('\n📸 Debug page screenshot saved')
  
  console.log('\n=== DEBUG PAGE TEST COMPLETE ===')
})