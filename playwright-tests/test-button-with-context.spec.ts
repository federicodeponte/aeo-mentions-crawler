import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Button works with business context filled', async ({ page }) => {
  console.log('=== TESTING BUTTON WITH SCAILE CONTEXT ===')
  
  await page.goto('http://localhost:3002/analytics')
  
  // Set business context in localStorage to simulate having SCAILE data
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
  
  // Reload to pick up the context
  await page.reload()
  await page.waitForTimeout(3000)
  
  // Check what we see now
  const pageContent = await page.textContent('body')
  const hasContextData = pageContent?.includes('Using Company Context') || pageContent?.includes('SCAILE')
  
  console.log(`Has SCAILE context data: ${hasContextData ? 'YES' : 'NO'}`)
  
  // Check button state with context
  const runButton = page.locator('button:has-text("Run Full Analytics")')
  const buttonExists = await runButton.count() > 0
  const isEnabled = buttonExists ? await runButton.isEnabled() : false
  const isDisabled = buttonExists ? await runButton.getAttribute('disabled') : 'not found'
  
  console.log(`Button exists: ${buttonExists ? 'YES' : 'NO'}`)
  console.log(`Button enabled with SCAILE context: ${isEnabled ? 'YES' : 'NO'}`)
  console.log(`Button disabled attr: ${isDisabled || 'NULL'}`)
  
  if (isEnabled) {
    console.log('✅ SUCCESS: Button is enabled with SCAILE context!')
    
    try {
      await runButton.click()
      console.log('✅ Button clicked successfully with SCAILE context')
      
      // Check if loading appears
      await page.waitForTimeout(5000)
      const hasLoading = await page.locator('text=Running Analytics').count() > 0
      console.log(`Loading appeared with SCAILE context: ${hasLoading ? 'YES' : 'NO'}`)
      
      // Take screenshot of success state
      await page.screenshot({ path: '/tmp/button-success-with-context.png', fullPage: true })
      console.log('📸 Success screenshot saved')
      
    } catch (clickError) {
      console.log(`❌ Click failed with SCAILE context: ${clickError}`)
    }
  } else {
    console.log('❌ BUG STILL EXISTS: Button disabled when SCAILE context present!')
    
    // Check what might be causing it
    const alertElements = await page.locator('.text-red-500, .bg-red-500, [role="alert"]').count()
    console.log(`Error/alert elements visible: ${alertElements}`)
    
    // Check for missing products error
    const hasMissingProductsError = pageContent?.includes('Missing context data') || pageContent?.includes('add products/services')
    console.log(`Has missing products error: ${hasMissingProductsError ? 'YES' : 'NO'}`)
    
    // Take screenshot of bug state
    await page.screenshot({ path: '/tmp/button-bug-with-context.png', fullPage: true })
    console.log('📸 Bug screenshot saved')
  }
  
  console.log('=== SCAILE CONTEXT TEST COMPLETE ===')
})