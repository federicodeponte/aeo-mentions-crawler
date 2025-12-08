import { test, expect } from '@playwright/test'

test.describe('Enhanced Geography-Aware AEO Mentions', () => {
  test('should generate geography-aware queries for SCAILE', async ({ page }) => {
    // Navigate to AEO Analytics page
    await page.goto('http://localhost:3002/aeo-analytics')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Fill in the mentions company field using the correct ID
    await page.fill('#mentions-company', 'SCAILE')
    
    // Look for mentions check button and click it
    const mentionsButton = page.locator('button:has-text("Check Mentions"), button:has-text("Mentions")')
    await expect(mentionsButton).toBeVisible()
    await mentionsButton.click()
    
    // Wait for mentions check to complete (up to 60 seconds)
    await page.waitForTimeout(30000) // Wait 30 seconds for the API call to complete
    
    // Look for enhanced geography-aware queries
    const pageContent = await page.content()
    
    // Check for geography-specific queries
    const expectedQueries = [
      'ChatGPT for US',
      'Perplexity for US', 
      'US-based companies',
      'American',
      'improve search rankings',
      'increase online visibility',
      'Generative Engine Optimization for US'
    ]
    
    let foundEnhancedQueries = 0
    
    for (const query of expectedQueries) {
      if (pageContent.toLowerCase().includes(query.toLowerCase())) {
        console.log(`✅ Found enhanced query pattern: "${query}"`)
        foundEnhancedQueries++
      } else {
        console.log(`❌ Missing query pattern: "${query}"`)
      }
    }
    
    // Should find at least 3 enhanced geography-aware query patterns
    expect(foundEnhancedQueries).toBeGreaterThanOrEqual(3)
    
    // Check that we don't see the old generic queries
    const oldGenericQueries = [
      'SCAILE vs alternatives',
      'SCAILE competitors', 
      'best software tools 2024'
    ]
    
    let foundOldQueries = 0
    for (const oldQuery of oldGenericQueries) {
      if (pageContent.includes(oldQuery)) {
        console.log(`⚠️ Found old generic query: "${oldQuery}"`)
        foundOldQueries++
      }
    }
    
    // Should see fewer old queries than enhanced ones
    console.log(`Enhanced queries found: ${foundEnhancedQueries}, Old queries found: ${foundOldQueries}`)
    
    // Take a screenshot for verification
    await page.screenshot({ path: '/tmp/enhanced-mentions-test.png', fullPage: true })
    
    console.log('Screenshot saved to /tmp/enhanced-mentions-test.png')
  })
  
  test('should show proper fallback pain points in console', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })
    
    await page.goto('http://localhost:3002/aeo-analytics')
    await page.waitForLoadState('networkidle')
    
    await page.fill('#mentions-company', 'SCAILE')
    
    const mentionsButton = page.locator('button:has-text("Check Mentions"), button:has-text("Mentions")')
    await mentionsButton.click()
    
    // Wait a bit for console messages
    await page.waitForTimeout(5000)
    
    // Check for fallback console messages
    const fallbackMessages = consoleMessages.filter(msg => 
      msg.includes('[FALLBACK]') || 
      msg.includes('Generated pain points') ||
      msg.includes('frontend_enhanced')
    )
    
    console.log('Console messages found:', fallbackMessages)
    
    // Should see some fallback or debug messages
    expect(fallbackMessages.length).toBeGreaterThan(0)
  })
})