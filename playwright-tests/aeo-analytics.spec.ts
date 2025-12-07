import { test, expect } from '@playwright/test'

/**
 * AEO Analytics Page - Comprehensive E2E Tests
 * 
 * Tests the refactored AEO Analytics page with:
 * - Two-panel layout (forms on left, results on right)
 * - Health Check functionality
 * - Mentions Check functionality
 * - Tabbed results display
 * - Context integration
 */

test.describe('AEO Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to AEO Analytics page
    await page.goto('/aeo-analytics')
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('AEO Analytics')
  })

  test('should display page title and description', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('AEO Analytics')
    
    // Check description
    await expect(page.locator('text=Analyze your AEO performance')).toBeVisible()
  })

  test('should display both input forms', async ({ page }) => {
    // Health Check form
    await expect(page.locator('text=AEO Health Check')).toBeVisible()
    await expect(page.locator('text=Analyze technical SEO')).toBeVisible()
    await expect(page.getByLabel('Website URL *')).toBeVisible()
    
    // Mentions Check form
    await expect(page.locator('text=AEO Mentions Check')).toBeVisible()
    await expect(page.locator('text=Test visibility across AI platforms')).toBeVisible()
    await expect(page.getByLabel('OpenRouter API Key *')).toBeVisible()
    await expect(page.getByLabel('Company Name *')).toBeVisible()
  })

  test('should enable Health Check button when URL is entered', async ({ page }) => {
    const urlInput = page.getByLabel('Website URL *')
    const runButton = page.getByRole('button', { name: /Run Health Check/i })
    
    // Initially disabled (empty URL)
    await expect(runButton).toBeDisabled()
    
    // Type URL
    await urlInput.fill('https://example.com')
    
    // Button should be enabled
    await expect(runButton).toBeEnabled()
  })

  test('should enable Mentions Check button when all required fields are filled', async ({ page }) => {
    const apiKeyInput = page.getByLabel('OpenRouter API Key *')
    const companyInput = page.getByLabel('Company Name *')
    const checkButton = page.getByRole('button', { name: /Check Mentions/i })
    
    // Initially disabled
    await expect(checkButton).toBeDisabled()
    
    // Fill API key
    await apiKeyInput.fill('sk-or-v1-test-key')
    await expect(checkButton).toBeDisabled() // Still disabled (missing company)
    
    // Fill company name
    await companyInput.fill('Test Company')
    
    // Button should be enabled
    await expect(checkButton).toBeEnabled()
  })

  test('should show loading state when Health Check is running', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/aeo/health-check', async route => {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://example.com',
          score: 85,
          grade: 'B',
          checks: [
            {
              category: 'Technical SEO',
              name: 'HTTPS',
              status: 'pass',
              message: 'HTTPS is enabled',
              recommendation: 'Good',
              score: 100
            }
          ],
          summary: {
            passed: 1,
            warnings: 0,
            failed: 0
          }
        })
      })
    })

    const urlInput = page.getByLabel('Website URL *')
    const runButton = page.getByRole('button', { name: /Run Health Check/i })
    
    await urlInput.fill('https://example.com')
    await runButton.click()
    
    // Check loading state
    await expect(page.getByText(/Running Check/i)).toBeVisible()
    await expect(runButton).toBeDisabled()
  })

  test('should display Health Check results in right panel after completion', async ({ page }) => {
    // Mock successful health check response
    await page.route('**/api/aeo/health-check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://example.com',
          score: 85,
          grade: 'B',
          checks: [
            {
              category: 'Technical SEO',
              name: 'HTTPS',
              status: 'pass',
              message: 'HTTPS is enabled',
              recommendation: 'Good',
              score: 100
            },
            {
              category: 'Technical SEO',
              name: 'Mobile Friendly',
              status: 'warning',
              message: 'Some mobile issues detected',
              recommendation: 'Fix mobile layout',
              score: 70
            }
          ],
          summary: {
            passed: 1,
            warnings: 1,
            failed: 0
          }
        })
      })
    })

    // Run health check
    await page.getByLabel('Website URL *').fill('https://example.com')
    await page.getByRole('button', { name: /Run Health Check/i }).click()
    
    // Wait for results to appear
    await expect(page.locator('text=AEO Health Score')).toBeVisible({ timeout: 10000 })
    
    // Check results panel appears
    await expect(page.locator('text=Health Check')).toBeVisible()
    
    // Check score is displayed
    await expect(page.locator('text=/85/')).toBeVisible()
    
    // Check grade is displayed
    await expect(page.locator('text=/B/')).toBeVisible()
  })

  test('should display Mentions Check results in right panel after completion', async ({ page }) => {
    // Mock successful mentions check response
    await page.route('**/api/aeo/mentions-check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyName: 'Test Company',
          visibility: 75,
          band: 'Strong',
          mentions: 30,
          presence_rate: 75.0,
          quality_score: 7.5,
          platform_stats: {
            'Perplexity': {
              mentions: 8,
              quality_score: 8.0,
              responses: 10
            },
            'ChatGPT': {
              mentions: 7,
              quality_score: 7.5,
              responses: 10
            }
          },
          query_results: [
            {
              query: 'What is Test Company?',
              platform: 'Perplexity',
              dimension: 'problem-solving',
              raw_mentions: 2,
              capped_mentions: 2,
              quality_score: 8.5,
              mention_type: 'primary',
              response_text: 'Test Company is a leading provider of...',
              competitor_mentions: [],
              source_urls: ['https://example.com']
            }
          ],
          actualQueriesProcessed: 10,
          execution_time_seconds: 45,
          total_cost: 0.05,
          total_tokens: 5000,
          mode: 'fast'
        })
      })
    })

    // Fill required fields
    await page.getByLabel('OpenRouter API Key *').fill('sk-or-v1-test-key')
    await page.getByLabel('Company Name *').fill('Test Company')
    
    // Run mentions check
    await page.getByRole('button', { name: /Check Mentions/i }).click()
    
    // Wait for results
    await expect(page.locator('text=AI Visibility Score')).toBeVisible({ timeout: 30000 })
    
    // Check results panel appears
    await expect(page.locator('text=AEO Mentions')).toBeVisible()
    
    // Check visibility score
    await expect(page.locator('text=/75/')).toBeVisible()
    
    // Check band
    await expect(page.locator('text=Strong')).toBeVisible()
  })

  test('should show error message for invalid Health Check URL', async ({ page }) => {
    // Mock error response
    await page.route('**/api/aeo/health-check', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid URL format'
        })
      })
    })

    await page.getByLabel('Website URL *').fill('invalid-url')
    await page.getByRole('button', { name: /Run Health Check/i }).click()
    
    // Check error message appears
    await expect(page.locator('text=/Invalid URL/i')).toBeVisible({ timeout: 5000 })
  })

  test('should show error message when Mentions Check API key is missing', async ({ page }) => {
    await page.getByLabel('Company Name *').fill('Test Company')
    
    // Try to click button (should be disabled)
    const checkButton = page.getByRole('button', { name: /Check Mentions/i })
    await expect(checkButton).toBeDisabled()
  })

  test('should switch between Health and Mentions result tabs', async ({ page }) => {
    // Mock both API responses
    await page.route('**/api/aeo/health-check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://example.com',
          score: 85,
          grade: 'B',
          checks: [],
          summary: { passed: 0, warnings: 0, failed: 0 }
        })
      })
    })

    await page.route('**/api/aeo/mentions-check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyName: 'Test Company',
          visibility: 75,
          band: 'Strong',
          mentions: 30,
          presence_rate: 75.0,
          quality_score: 7.5,
          platform_stats: {},
          query_results: [],
          actualQueriesProcessed: 10,
          execution_time_seconds: 45,
          total_cost: 0.05,
          total_tokens: 5000,
          mode: 'fast'
        })
      })
    })

    // Run health check
    await page.getByLabel('Website URL *').fill('https://example.com')
    await page.getByRole('button', { name: /Run Health Check/i }).click()
    await expect(page.locator('text=AEO Health Score')).toBeVisible({ timeout: 10000 })
    
    // Run mentions check
    await page.getByLabel('OpenRouter API Key *').fill('sk-or-v1-test-key')
    await page.getByLabel('Company Name *').fill('Test Company')
    await page.getByRole('button', { name: /Check Mentions/i }).click()
    await expect(page.locator('text=AI Visibility Score')).toBeVisible({ timeout: 30000 })
    
    // Switch to Health tab
    await page.getByRole('tab', { name: /Health/i }).click()
    await expect(page.locator('text=AEO Health Score')).toBeVisible()
    
    // Switch to Mentions tab
    await page.getByRole('tab', { name: /Mentions/i }).click()
    await expect(page.locator('text=AI Visibility Score')).toBeVisible()
  })

  test('should display query results with full details in Mentions tab', async ({ page }) => {
    // Mock mentions check with detailed query results
    await page.route('**/api/aeo/mentions-check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyName: 'Test Company',
          visibility: 75,
          band: 'Strong',
          mentions: 30,
          presence_rate: 75.0,
          quality_score: 7.5,
          platform_stats: {
            'Perplexity': { mentions: 8, quality_score: 8.0, responses: 10 }
          },
          query_results: [
            {
              query: 'What is Test Company?',
              platform: 'Perplexity',
              dimension: 'problem-solving',
              raw_mentions: 2,
              capped_mentions: 2,
              quality_score: 8.5,
              mention_type: 'primary',
              position: 1,
              response_text: 'Test Company is a leading provider of innovative solutions...',
              competitor_mentions: [
                { name: 'Competitor A', count: 1 }
              ],
              source_urls: [
                'https://example.com/page1',
                'https://example.com/page2'
              ]
            }
          ],
          actualQueriesProcessed: 10,
          execution_time_seconds: 45,
          total_cost: 0.05,
          total_tokens: 5000,
          mode: 'fast'
        })
      })
    })

    await page.getByLabel('OpenRouter API Key *').fill('sk-or-v1-test-key')
    await page.getByLabel('Company Name *').fill('Test Company')
    await page.getByRole('button', { name: /Check Mentions/i }).click()
    
    // Wait for results
    await expect(page.locator('text=AI Visibility Score')).toBeVisible({ timeout: 30000 })
    
    // Check query results section
    await expect(page.locator('text=Query Results')).toBeVisible()
    
    // Check query is displayed
    await expect(page.locator('text=What is Test Company?')).toBeVisible()
    
    // Expand query result (click accordion)
    const queryAccordion = page.locator('text=What is Test Company?').first()
    await queryAccordion.click()
    
    // Check response text is visible
    await expect(page.locator('text=Test Company is a leading provider')).toBeVisible()
    
    // Check dimension is shown
    await expect(page.locator('text=problem-solving')).toBeVisible()
    
    // Check mention type is shown
    await expect(page.locator('text=primary')).toBeVisible()
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check forms stack vertically
    const healthForm = page.locator('text=AEO Health Check')
    const mentionsForm = page.locator('text=AEO Mentions Check')
    
    await expect(healthForm).toBeVisible()
    await expect(mentionsForm).toBeVisible()
    
    // Check forms are stacked (not side-by-side)
    const healthBox = await healthForm.boundingBox()
    const mentionsBox = await mentionsForm.boundingBox()
    
    // Mentions form should be below health form
    expect(mentionsBox!.y).toBeGreaterThan(healthBox!.y + healthBox!.height)
  })

  test('should show link to openrouter.ai for API key', async ({ page }) => {
    const link = page.getByRole('link', { name: /openrouter\.ai\/keys/i })
    
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', 'https://openrouter.ai/keys')
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('should persist results when switching tabs', async ({ page }) => {
    // Mock health check
    await page.route('**/api/aeo/health-check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://example.com',
          score: 85,
          grade: 'B',
          checks: [],
          summary: { passed: 0, warnings: 0, failed: 0 }
        })
      })
    })

    // Run health check
    await page.getByLabel('Website URL *').fill('https://example.com')
    await page.getByRole('button', { name: /Run Health Check/i }).click()
    await expect(page.locator('text=AEO Health Score')).toBeVisible({ timeout: 10000 })
    
    // Switch to Mentions tab (should show placeholder since no results yet)
    await page.getByRole('tab', { name: /Mentions/i }).click()
    await expect(page.locator('text=Run a mentions check')).toBeVisible()
    
    // Switch back to Health tab (results should still be there)
    await page.getByRole('tab', { name: /Health/i }).click()
    await expect(page.locator('text=AEO Health Score')).toBeVisible()
    await expect(page.locator('text=/85/')).toBeVisible()
  })
})

