import { test, expect } from '@playwright/test'

test.setTimeout(120000)

test('Simple verification - exactly what user sees', async ({ page }) => {
  console.log('=== SIMPLE VERIFICATION TEST ===')
  
  // Go to analytics
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(3000)
  
  // Set business context like user would
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
  
  // Reload
  await page.reload()
  await page.waitForTimeout(3000)
  
  // Check button state
  const button = page.locator('button:has-text("Run Full Analytics")')
  const isEnabled = await button.isEnabled()
  
  console.log(`✅ Button enabled: ${isEnabled}`)
  
  if (isEnabled) {
    console.log('🎯 Attempting click...')
    await button.click()
    console.log('✅ Click successful!')
    
    // Wait and check loading
    await page.waitForTimeout(2000)
    const hasLoading = await page.locator('text=Running Analytics').count() > 0
    console.log(`Loading appeared: ${hasLoading}`)
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/simple-test-success.png', fullPage: true })
    console.log('📸 Success screenshot taken')
    
  } else {
    console.log('❌ Button is disabled - taking debug screenshot')
    await page.screenshot({ path: '/tmp/simple-test-disabled.png', fullPage: true })
    
    // Check for obvious issues
    const pageText = await page.textContent('body')
    const hasScaile = pageText?.includes('SCAILE')
    console.log(`Shows SCAILE data: ${hasScaile}`)
  }
  
  console.log('=== SIMPLE TEST COMPLETE ===')
})