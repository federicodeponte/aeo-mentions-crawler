import { test, expect } from '@playwright/test'

test.setTimeout(120000)

test('Test analytics page after React fix', async ({ page }) => {
  console.log('=== TESTING AFTER REACT FIX ===')
  
  // Monitor console errors
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
      console.log(`❌ Console error: ${msg.text()}`)
    }
  })
  
  // Go to analytics page
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(3000)
  
  console.log('✅ Analytics page loaded')
  
  // Check for React errors
  if (consoleErrors.some(err => err.includes('Invalid hook call') || err.includes('useContext'))) {
    console.log('❌ React errors still present!')
    consoleErrors.forEach(err => console.log(`  - ${err}`))
  } else {
    console.log('✅ No React errors detected')
  }
  
  // Test button without context
  console.log('\n🔍 Testing button WITHOUT business context...')
  const buttonWithoutContext = page.locator('button:has-text("Run Full Analytics")')
  const existsWithoutContext = await buttonWithoutContext.count() > 0
  const enabledWithoutContext = existsWithoutContext ? await buttonWithoutContext.isEnabled() : false
  
  console.log(`Button exists (no context): ${existsWithoutContext}`)
  console.log(`Button enabled (no context): ${enabledWithoutContext}`)
  
  if (existsWithoutContext && enabledWithoutContext) {
    console.log('✅ Clicking button without context...')
    await buttonWithoutContext.click()
    await page.waitForTimeout(3000)
    
    const hasLoading = await page.locator('text=Running Analytics').count() > 0
    console.log(`Loading state appeared: ${hasLoading ? 'YES' : 'NO'}`)
    
    // Wait for completion or stop
    await page.waitForTimeout(5000)
  }
  
  // Refresh and add business context
  await page.reload()
  await page.waitForTimeout(2000)
  
  console.log('\n📝 Adding business context...')
  await page.evaluate(() => {
    const businessContext = {
      companyName: 'SCAILE',
      companyWebsite: 'https://scaile.tech',
      products: ['AEO Services', 'Content Marketing'],
      valueProposition: 'AI-powered AEO optimization',
      targetIndustries: 'B2B SaaS',
      countries: ['US', 'UK']
    }
    localStorage.setItem('business-context', JSON.stringify(businessContext))
  })
  
  await page.reload()
  await page.waitForTimeout(3000)
  
  // Test button with context
  console.log('\n🎯 Testing button WITH business context...')
  const bodyText = await page.textContent('body')
  const hasScaileData = bodyText?.includes('SCAILE')
  
  console.log(`Shows SCAILE data: ${hasScaileData}`)
  
  const buttonWithContext = page.locator('button:has-text("Run Full Analytics")')
  const existsWithContext = await buttonWithContext.count() > 0
  const enabledWithContext = existsWithContext ? await buttonWithContext.isEnabled() : false
  
  console.log(`Button exists (with context): ${existsWithContext}`)
  console.log(`Button enabled (with context): ${enabledWithContext}`)
  
  if (existsWithContext && enabledWithContext) {
    console.log('✅ SUCCESS: Button enabled with business context!')
    
    try {
      await buttonWithContext.click()
      console.log('✅ Button clicked successfully with context!')
      
      await page.waitForTimeout(3000)
      const hasLoadingWithContext = await page.locator('text=Running Analytics').count() > 0
      console.log(`Loading state with context: ${hasLoadingWithContext ? 'YES' : 'NO'}`)
      
    } catch (error) {
      console.log(`❌ Click failed: ${error}`)
    }
  } else {
    console.log('❌ Button still disabled with context!')
  }
  
  // Final error check
  if (consoleErrors.length > 0) {
    console.log(`\n⚠️ Total console errors: ${consoleErrors.length}`)
  } else {
    console.log('\n✅ No JavaScript errors detected')
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/after-fix-test.png', fullPage: true })
  console.log('\n📸 Screenshot saved')
  
  console.log('\n=== REACT FIX TEST COMPLETE ===')
})