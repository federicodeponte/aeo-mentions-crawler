import { test, expect } from '@playwright/test'

test.setTimeout(180000)

test('Compare keywords vs analytics button behavior', async ({ page }) => {
  console.log('=== COMPARING KEYWORDS VS ANALYTICS BUTTON BEHAVIOR ===')
  
  // Test 1: Keywords page behavior
  console.log('\n🔍 Testing KEYWORDS page...')
  await page.goto('http://localhost:3002/keywords')
  await page.waitForTimeout(3000)
  
  const keywordsButton = page.locator('button:has-text("Generate Keywords")')
  const keywordsExists = await keywordsButton.count() > 0
  const keywordsEnabled = keywordsExists ? await keywordsButton.isEnabled() : false
  const keywordsContent = await page.textContent('body')
  const keywordsHasNoContext = keywordsContent?.includes('No Company Context Set')
  
  console.log(`Keywords button exists: ${keywordsExists}`)
  console.log(`Keywords button enabled: ${keywordsEnabled}`)
  console.log(`Keywords shows "No Company Context": ${keywordsHasNoContext}`)
  
  // Test 2: Analytics page behavior (should match)
  console.log('\n🎯 Testing ANALYTICS page...')
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(3000)
  
  const analyticsButton = page.locator('button:has-text("Run Full Analytics")').first()
  const analyticsExists = await analyticsButton.count() > 0
  const analyticsEnabled = analyticsExists ? await analyticsButton.isEnabled() : false
  const analyticsContent = await page.textContent('body')
  const analyticsHasNoContext = analyticsContent?.includes('No Company Context Set')
  
  console.log(`Analytics button exists: ${analyticsExists}`)
  console.log(`Analytics button enabled: ${analyticsEnabled}`)
  console.log(`Analytics shows "No Company Context": ${analyticsHasNoContext}`)
  
  // Compare behavior without context
  console.log('\n📊 COMPARISON WITHOUT CONTEXT:')
  console.log(`Both buttons disabled: ${!keywordsEnabled && !analyticsEnabled ? 'YES ✅' : 'NO ❌'}`)
  console.log(`Both show no context message: ${keywordsHasNoContext && analyticsHasNoContext ? 'YES ✅' : 'NO ❌'}`)
  
  // Test 3: Add business context via the proper localStorage key
  console.log('\n📝 Adding business context (proper key)...')
  await page.evaluate(() => {
    const businessContext = {
      companyName: 'SCAILE',
      companyWebsite: 'https://scaile.tech',
      products: ['AEO Services', 'Content Marketing'],
      valueProposition: 'AI-powered AEO optimization'
    }
    // Use the same key as useContextStorage hook
    localStorage.setItem('bulk-gpt-business-context', JSON.stringify(businessContext))
  })
  
  // Test keywords page with context
  console.log('\n🔍 Testing KEYWORDS page WITH context...')
  await page.goto('http://localhost:3002/keywords')
  await page.waitForTimeout(3000)
  
  const keywordsButtonWithContext = page.locator('button:has-text("Generate Keywords")')
  const keywordsEnabledWithContext = await keywordsButtonWithContext.isEnabled()
  const keywordsContentWithContext = await page.textContent('body')
  const keywordsHasContext = keywordsContentWithContext?.includes('Using Company Context')
  
  console.log(`Keywords button enabled with context: ${keywordsEnabledWithContext}`)
  console.log(`Keywords shows "Using Company Context": ${keywordsHasContext}`)
  
  // Test analytics page with context
  console.log('\n🎯 Testing ANALYTICS page WITH context...')
  await page.goto('http://localhost:3002/analytics')
  await page.waitForTimeout(3000)
  
  const analyticsButtonWithContext = page.locator('button:has-text("Run Full Analytics")').first()
  const analyticsEnabledWithContext = await analyticsButtonWithContext.isEnabled()
  const analyticsContentWithContext = await page.textContent('body')
  const analyticsHasContext = analyticsContentWithContext?.includes('Using Company Context')
  const analyticsShowsScaile = analyticsContentWithContext?.includes('SCAILE')
  
  console.log(`Analytics button enabled with context: ${analyticsEnabledWithContext}`)
  console.log(`Analytics shows "Using Company Context": ${analyticsHasContext}`)
  console.log(`Analytics shows SCAILE data: ${analyticsShowsScaile}`)
  
  // Compare behavior with context
  console.log('\n📊 COMPARISON WITH CONTEXT:')
  console.log(`Both buttons enabled: ${keywordsEnabledWithContext && analyticsEnabledWithContext ? 'YES ✅' : 'NO ❌'}`)
  console.log(`Both show context message: ${keywordsHasContext && analyticsHasContext ? 'YES ✅' : 'NO ❌'}`)
  
  // Final test: Try clicking both buttons
  if (keywordsEnabledWithContext) {
    console.log('\n🟢 Testing keywords button click...')
    try {
      await page.goto('http://localhost:3002/keywords')
      await page.waitForTimeout(2000)
      await page.locator('button:has-text("Generate Keywords")').click()
      console.log('✅ Keywords button clicked successfully')
    } catch (error) {
      console.log(`❌ Keywords button click failed: ${error}`)
    }
  }
  
  if (analyticsEnabledWithContext) {
    console.log('\n🔵 Testing analytics button click...')
    try {
      await page.goto('http://localhost:3002/analytics')
      await page.waitForTimeout(2000)
      await page.locator('button:has-text("Run Full Analytics")').first().click()
      console.log('✅ Analytics button clicked successfully')
    } catch (error) {
      console.log(`❌ Analytics button click failed: ${error}`)
    }
  }
  
  // Take final screenshot
  await page.screenshot({ path: '/tmp/keywords-analytics-comparison.png', fullPage: true })
  console.log('\n📸 Comparison screenshot saved')
  
  console.log('\n=== KEYWORDS VS ANALYTICS COMPARISON COMPLETE ===')
})