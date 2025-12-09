import { test, expect } from '@playwright/test'

test.setTimeout(180000) // 3 minutes

test('Debug results state management', async ({ page }) => {
  console.log('=== DEBUGGING RESULTS STATE MANAGEMENT ===')
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'log' && (msg.text().includes('Health') || msg.text().includes('Mentions') || msg.text().includes('Result'))) {
      console.log(`📝 CONSOLE: ${msg.text()}`)
    }
    if (msg.type() === 'error') {
      console.log(`❌ ERROR: ${msg.text()}`)
    }
  })
  
  await page.goto('http://localhost:3002/analytics')
  console.log('✅ Page loaded')
  
  // Click analytics button
  const runButton = page.locator('button:has-text("Run Full Analytics")')
  await runButton.click()
  console.log('🚀 Started analytics')
  
  // Wait for loading to appear
  await page.waitForTimeout(5000)
  
  // Check if loading state is visible
  const isLoading = await page.locator('text=Running Analytics').count() > 0
  console.log(`Loading state visible: ${isLoading ? 'YES' : 'NO'}`)
  
  if (isLoading) {
    console.log('⏳ Waiting for analytics to complete...')
    // Wait longer for completion
    await page.waitForTimeout(60000) // 60 seconds
    
    // Check what state we're in after completion
    const finalButtonText = await runButton.textContent()
    console.log(`Final button text: "${finalButtonText}"`)
    
    // Check both tabs for results
    const healthTab = page.locator('button:has-text("AEO Health")')
    const mentionsTab = page.locator('button:has-text("AEO Mentions")')
    
    console.log('🔍 Checking Health tab...')
    if (await healthTab.count() > 0) {
      await healthTab.click()
      await page.waitForTimeout(2000)
      
      const healthContent = await page.textContent('body')
      const hasHealthScore = healthContent?.includes('54') || healthContent?.includes('Score')
      console.log(`Health tab has score: ${hasHealthScore ? 'YES' : 'NO'}`)
      
      if (hasHealthScore) {
        console.log('✅ Health results found in Health tab')
      }
    }
    
    console.log('🔍 Checking Mentions tab...')
    if (await mentionsTab.count() > 0) {
      await mentionsTab.click()
      await page.waitForTimeout(2000)
      
      const mentionsContent = await page.textContent('body')
      const hasMentionsScore = mentionsContent?.includes('19') || mentionsContent?.includes('Visibility') || mentionsContent?.includes('%')
      console.log(`Mentions tab has score: ${hasMentionsScore ? 'YES' : 'NO'}`)
      
      if (hasMentionsScore) {
        console.log('✅ Mentions results found in Mentions tab')
      }
    }
    
    // Take screenshot of final state
    await page.screenshot({ path: '/tmp/final-state-debug.png', fullPage: true })
    console.log('📸 Final state screenshot taken')
    
  } else {
    console.log('❌ Loading state never appeared - button click may have failed')
  }
  
  console.log('=== RESULTS STATE DEBUG COMPLETE ===')
})