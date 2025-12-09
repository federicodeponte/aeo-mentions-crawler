import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Test user scenario with filled context', async ({ page }) => {
  console.log('=== TESTING USER SCENARIO ===')
  
  // Navigate to the analytics page 
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(2000)
  
  // Try to set business context via the UI like a real user would
  console.log('🌐 Going to context page first...')
  await page.goto('http://localhost:3002/context') 
  await page.waitForTimeout(3000)
  
  // Check if there's a form to fill context
  const hasForm = await page.locator('form').count() > 0
  console.log(`Context form found: ${hasForm ? 'YES' : 'NO'}`)
  
  // If there's a form, try to fill it
  if (hasForm) {
    console.log('📝 Filling context form...')
    
    // Look for company name input
    const companyNameInput = page.locator('input[name*="company"], input[placeholder*="company" i]').first()
    if (await companyNameInput.count() > 0) {
      await companyNameInput.fill('SCAILE')
      console.log('✅ Filled company name')
    }
    
    // Look for website input
    const websiteInput = page.locator('input[name*="website"], input[placeholder*="website" i]').first()
    if (await websiteInput.count() > 0) {
      await websiteInput.fill('https://scaile.tech')
      console.log('✅ Filled website')
    }
    
    // Look for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first()
    if (await submitButton.count() > 0) {
      await submitButton.click()
      console.log('✅ Submitted context form')
      await page.waitForTimeout(2000)
    }
  } else {
    // No form, set localStorage directly as fallback
    console.log('📝 Setting context via localStorage...')
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
  }
  
  // Navigate back to analytics
  console.log('🔄 Returning to analytics page...')
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(3000)
  
  // Check what the page shows
  const bodyText = await page.textContent('body')
  const hasScaileData = bodyText?.includes('SCAILE') || bodyText?.includes('scaile.tech')
  const hasContext = bodyText?.includes('Using Company Context') || bodyText?.includes('Company Context')
  const isReadyToRun = bodyText?.includes('Ready to Run')
  
  console.log(`Shows SCAILE data: ${hasScaileData ? 'YES' : 'NO'}`)
  console.log(`Shows context indicator: ${hasContext ? 'YES' : 'NO'}`)
  console.log(`Shows "Ready to Run": ${isReadyToRun ? 'YES' : 'NO'}`)
  
  // Find the run button
  const runButton = page.locator('button').filter({ hasText: /Run.*Analytics/i }).first()
  const buttonExists = await runButton.count() > 0
  
  if (buttonExists) {
    const buttonText = await runButton.textContent()
    const isEnabled = await runButton.isEnabled()
    const hasDisabledAttr = await runButton.getAttribute('disabled')
    const buttonClasses = await runButton.getAttribute('class')
    
    console.log(`Button text: "${buttonText}"`)
    console.log(`Button enabled: ${isEnabled ? 'YES' : 'NO'}`)
    console.log(`Has disabled attribute: ${hasDisabledAttr !== null ? 'YES' : 'NO'}`)
    console.log(`Button classes: ${buttonClasses}`)
    
    if (isEnabled) {
      console.log('✅ Button is enabled - attempting click...')
      try {
        await runButton.click()
        console.log('✅ Button clicked successfully!')
        
        // Wait and check for loading state
        await page.waitForTimeout(3000)
        const hasLoading = await page.locator('text=Running Analytics, text=Loading').count() > 0
        console.log(`Loading state appeared: ${hasLoading ? 'YES' : 'NO'}`)
        
      } catch (error) {
        console.log(`❌ Button click failed: ${error}`)
      }
    } else {
      console.log('❌ Button is DISABLED - checking why...')
      
      // Look for error messages
      const errorElements = await page.locator('.text-red-500, .bg-red-100, [role="alert"], .alert').allTextContents()
      console.log(`Error messages found: ${errorElements.length}`)
      errorElements.forEach((msg, i) => {
        console.log(`  Error ${i + 1}: "${msg.trim()}"`)
      })
    }
  } else {
    console.log('❌ Run button not found!')
  }
  
  // Take a screenshot for debugging
  await page.screenshot({ path: '/tmp/user-scenario-debug.png', fullPage: true })
  console.log('📸 Screenshot saved for debugging')
  
  console.log('=== USER SCENARIO TEST COMPLETE ===')
})