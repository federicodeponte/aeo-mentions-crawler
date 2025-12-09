import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Test exact user flow - step by step debugging', async ({ page }) => {
  console.log('=== EXACT USER FLOW DEBUGGING ===')
  
  // Step 1: Go to analytics fresh
  console.log('\n🚀 Step 1: Fresh analytics page...')
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(5000) // Wait longer for full load
  
  console.log('✅ Page loaded')
  
  // Step 2: Check initial button state
  console.log('\n🔍 Step 2: Check initial button state...')
  const initialButton = page.locator('button:has-text("Run Full Analytics")')
  const initialExists = await initialButton.count() > 0
  const initialEnabled = initialExists ? await initialButton.isEnabled() : false
  const initialClasses = initialExists ? await initialButton.getAttribute('class') : 'not found'
  
  console.log(`Initial button exists: ${initialExists}`)
  console.log(`Initial button enabled: ${initialEnabled}`)
  console.log(`Initial button classes: ${initialClasses}`)
  
  // Step 3: Try to click without context
  if (initialEnabled) {
    console.log('\n✅ Step 3: Clicking button WITHOUT context...')
    try {
      await initialButton.click()
      console.log('✅ Click successful without context')
      
      // Wait to see if loading starts
      await page.waitForTimeout(3000)
      const loadingWithoutContext = await page.locator('text=Running Analytics').count() > 0
      console.log(`Loading without context: ${loadingWithoutContext}`)
      
      // Wait for it to finish or stop it
      await page.waitForTimeout(5000)
    } catch (error) {
      console.log(`❌ Click failed without context: ${error}`)
    }
  } else {
    console.log('❌ Step 3: Button disabled without context!')
  }
  
  // Step 4: Refresh page
  console.log('\n🔄 Step 4: Refresh page...')
  await page.reload()
  await page.waitForTimeout(5000)
  
  // Step 5: Set context via context page (like a real user)
  console.log('\n📝 Step 5: Going to context page to set business context...')
  await page.goto('http://localhost:3002/context')
  await page.waitForTimeout(3000)
  
  // Look for any form fields
  const companyField = page.locator('input[placeholder*="company" i], input[name*="company" i]').first()
  const websiteField = page.locator('input[placeholder*="website" i], input[name*="website" i]').first()
  
  if (await companyField.count() > 0) {
    console.log('📝 Found company field, filling...')
    await companyField.fill('SCAILE')
  }
  
  if (await websiteField.count() > 0) {
    console.log('📝 Found website field, filling...')
    await websiteField.fill('https://scaile.tech')
  }
  
  // Look for save button
  const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first()
  if (await saveButton.count() > 0) {
    console.log('💾 Found save button, clicking...')
    await saveButton.click()
    await page.waitForTimeout(2000)
  } else {
    // Fallback to localStorage
    console.log('💾 No save button, setting localStorage directly...')
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
  
  // Step 6: Return to analytics with context
  console.log('\n🔄 Step 6: Return to analytics with context...')
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(5000)
  
  // Step 7: Check what the page shows
  console.log('\n🔍 Step 7: Check page content with context...')
  const bodyText = await page.textContent('body')
  const showsScaile = bodyText?.includes('SCAILE')
  const showsContext = bodyText?.includes('Using Company Context') || bodyText?.includes('Company Context')
  
  console.log(`Shows SCAILE: ${showsScaile}`)
  console.log(`Shows context indicator: ${showsContext}`)
  
  // Step 8: Detailed button analysis
  console.log('\n🎯 Step 8: Detailed button analysis with context...')
  
  const contextButton = page.locator('button:has-text("Run Full Analytics")')
  const contextExists = await contextButton.count() > 0
  const contextEnabled = contextExists ? await contextButton.isEnabled() : false
  const contextDisabled = contextExists ? await contextButton.getAttribute('disabled') : 'not found'
  const contextClasses = contextExists ? await contextButton.getAttribute('class') : 'not found'
  
  console.log(`Button exists with context: ${contextExists}`)
  console.log(`Button enabled with context: ${contextEnabled}`)
  console.log(`Button disabled attribute: ${contextDisabled}`)
  console.log(`Button classes: ${contextClasses}`)
  
  // Check React state
  const reactState = await page.evaluate(() => {
    // Try to find any React state
    const button = document.querySelector('button[class*="Run"], button:contains("Run")')
    if (!button) return { error: 'Button not found' }
    
    return {
      disabled: button.disabled,
      hasDisabledAttr: button.hasAttribute('disabled'),
      ariaDisabled: button.getAttribute('aria-disabled'),
      pointerEvents: getComputedStyle(button).pointerEvents,
      opacity: getComputedStyle(button).opacity,
      innerHTML: button.innerHTML,
      outerHTML: button.outerHTML.substring(0, 200) + '...'
    }
  })
  
  console.log('🔍 React/DOM state:', JSON.stringify(reactState, null, 2))
  
  // Step 9: Try clicking with context
  if (contextEnabled) {
    console.log('\n✅ Step 9: Trying to click with context...')
    try {
      await contextButton.click()
      console.log('✅ Click successful WITH context!')
      
      await page.waitForTimeout(3000)
      const loadingWithContext = await page.locator('text=Running Analytics').count() > 0
      console.log(`Loading with context: ${loadingWithContext}`)
      
    } catch (error) {
      console.log(`❌ Click failed with context: ${error}`)
    }
  } else {
    console.log('❌ Step 9: BUG REPRODUCED - Button disabled with context!')
    
    // Deep debug
    const debugInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        localStorage: Object.keys(localStorage).reduce((acc, key) => {
          acc[key] = localStorage.getItem(key)
          return acc
        }, {}),
        userAgent: navigator.userAgent,
        reactDevtools: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__
      }
    })
    
    console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2))
  }
  
  // Final screenshot
  await page.screenshot({ path: '/tmp/exact-user-flow.png', fullPage: true })
  console.log('\n📸 Screenshot saved')
  
  console.log('\n=== EXACT USER FLOW COMPLETE ===')
})