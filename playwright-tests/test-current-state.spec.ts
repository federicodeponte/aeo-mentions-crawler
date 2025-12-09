import { test, expect } from '@playwright/test'

test.setTimeout(120000) // 2 minutes

test('Test current button state with business context', async ({ page }) => {
  console.log('=== TESTING CURRENT BUTTON STATE ===')
  
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(2000)
  
  console.log('🔍 Initial state check...')
  const bodyText = await page.textContent('body')
  console.log(`Page loaded: ${bodyText?.includes('Run Full Analytics') ? 'YES' : 'NO'}`)
  
  // Check button without context first
  console.log('\n📝 Testing WITHOUT context...')
  const runButtonNoContext = page.locator('button:has-text("Run Full Analytics")')
  const existsNoContext = await runButtonNoContext.count() > 0
  const enabledNoContext = existsNoContext ? await runButtonNoContext.isEnabled() : false
  
  console.log(`Button exists (no context): ${existsNoContext ? 'YES' : 'NO'}`)
  console.log(`Button enabled (no context): ${enabledNoContext ? 'YES' : 'NO'}`)
  
  if (enabledNoContext) {
    console.log('✅ Button works WITHOUT context')
  } else {
    console.log('❌ Button broken WITHOUT context')
  }
  
  // Now add business context
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
  
  // Reload to pick up context
  console.log('🔄 Reloading with context...')
  await page.reload()
  await page.waitForTimeout(3000)
  
  // Check page state with context
  const bodyTextWithContext = await page.textContent('body')
  const hasScaileData = bodyTextWithContext?.includes('SCAILE') || bodyTextWithContext?.includes('scaile.tech')
  
  console.log(`Shows SCAILE data: ${hasScaileData ? 'YES' : 'NO'}`)
  
  // Check button with context
  console.log('\n🎯 Testing WITH context...')
  const runButtonWithContext = page.locator('button:has-text("Run Full Analytics")')
  const existsWithContext = await runButtonWithContext.count() > 0
  const enabledWithContext = existsWithContext ? await runButtonWithContext.isEnabled() : false
  const hasDisabledAttr = existsWithContext ? await runButtonWithContext.getAttribute('disabled') : 'not found'
  
  console.log(`Button exists (with context): ${existsWithContext ? 'YES' : 'NO'}`)
  console.log(`Button enabled (with context): ${enabledWithContext ? 'YES' : 'NO'}`)
  console.log(`Has disabled attribute: ${hasDisabledAttr !== null ? 'YES' : 'NO'}`)
  
  if (enabledWithContext) {
    console.log('✅ SUCCESS: Button works WITH context')
    
    try {
      await runButtonWithContext.click()
      console.log('✅ Button clicked successfully')
      
      await page.waitForTimeout(3000)
      const hasLoading = await page.locator('text=Running Analytics').count() > 0
      console.log(`Loading state appeared: ${hasLoading ? 'YES' : 'NO'}`)
      
    } catch (error) {
      console.log(`❌ Click failed: ${error}`)
    }
  } else {
    console.log('❌ BUG REPRODUCED: Button disabled with context!')
    
    // Debug information
    const loadingState = await page.evaluate(() => {
      // Try to find React component state
      const button = document.querySelector('button:contains("Run Full Analytics"), button[class*="Run"]')
      return {
        buttonFound: !!button,
        disabled: button?.hasAttribute('disabled'),
        className: button?.className,
        loading: window.localStorage?.getItem('loading') || 'not found'
      }
    })
    
    console.log('🔍 Debug info:', JSON.stringify(loadingState, null, 2))
    
    // Check for error messages
    const errorElements = await page.locator('.text-red-500, .bg-red-100, [role="alert"]').allTextContents()
    console.log(`Error messages found: ${errorElements.length}`)
    errorElements.forEach((msg, i) => {
      console.log(`  Error ${i + 1}: "${msg.trim()}"`)
    })
  }
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/current-state-test.png', fullPage: true })
  console.log('📸 Screenshot saved')
  
  console.log('=== CURRENT STATE TEST COMPLETE ===')
})