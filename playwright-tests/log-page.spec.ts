/**
 * E2E Test: LOG Page
 * Tests execution history display, export functionality, and file downloads
 * 
 * Prerequisites:
 * - Run `npm run test:setup` to start test server and create auth session
 * - Or run `npm run test:server` to start server on port 3334
 * 
 * This test requires authentication (uses 'chromium' project with auth)
 */

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'

test.describe('LOG Page', () => {
  test.beforeEach(async ({ page, context, browserName }) => {
    // Set up test data in localStorage before each test
    const testLogs = [
      {
        id: 'kw-test-1',
        type: 'keywords',
        timestamp: new Date().toISOString(),
        company: 'Test Company',
        url: 'https://example.com',
        language: 'en',
        country: 'US',
        count: 5,
        generationTime: 12.5,
        keywords: [
          {
            keyword: 'test keyword 1',
            aeo_type: 'informational',
            search_intent: 'learn',
            relevance_score: 8.5,
            ai_citation_potential: 'high',
            competition_level: 'medium',
          },
          {
            keyword: 'test keyword 2',
            aeo_type: 'transactional',
            search_intent: 'buy',
            relevance_score: 9.0,
            ai_citation_potential: 'very high',
            competition_level: 'low',
          },
        ],
      },
      {
        id: 'blog-test-1',
        type: 'blog',
        timestamp: new Date().toISOString(),
        company: 'Test Company',
        url: 'https://example.com',
        keyword: 'test blog keyword',
        wordCount: 1500,
        title: 'Test Blog Title',
        content: '# Test Blog\n\nThis is test content for the blog.',
        aeoScore: 78.5,
        generationTime: 45.2,
      },
      {
        id: 'analytics-test-1',
        type: 'analytics',
        timestamp: new Date().toISOString(),
        company: 'Test Company',
        url: 'https://example.com',
        healthResult: {
          overall_score: 87.5,
          category_scores: {
            technical_seo: 90,
            structured_data: 85,
            ai_crawler_readiness: 88,
            authority_signals: 87,
          },
          checks: [
            { name: 'HTTPS', status: 'pass', score: 100 },
            { name: 'Mobile Friendly', status: 'pass', score: 95 },
          ],
        },
        mentionsResult: {
          company_name: 'Test Company',
          total_mentions: 12,
          platform_results: [
            {
              platform: 'Perplexity',
              found: true,
              mentions: [
                { query: 'test query', mentioned: true },
              ],
            },
          ],
        },
        generationTime: 35.0,
      },
      {
        id: 'batch-test-1',
        type: 'blog_batch',
        timestamp: new Date().toISOString(),
        company: 'Test Company',
        url: 'https://example.com',
        batchId: 'batch-123',
        total: 10,
        successful: 9,
        failed: 1,
        results: [
          {
            keyword: 'keyword 1',
            title: 'Blog 1',
            word_count: 1500,
            aeo_score: 80,
            status: 'success',
          },
          {
            keyword: 'keyword 2',
            title: 'Blog 2',
            word_count: 1600,
            aeo_score: 75,
            status: 'success',
          },
          {
            keyword: 'keyword 3',
            title: 'Blog 3',
            word_count: 0,
            aeo_score: 0,
            status: 'failed',
          },
        ],
        generationTime: 180.5,
      },
    ]

    // Set localStorage before navigating
    await context.addInitScript((logs) => {
      localStorage.setItem('bulk-gpt-logs', JSON.stringify(logs))
    }, testLogs)

    // Navigate to LOG page
    // If auth is required, it will redirect - we'll handle that
    await page.goto('/log', { waitUntil: 'networkidle' })
    
    // If redirected to auth, we can skip or handle differently
    // For now, just wait for the page to load
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display all log entries', async ({ page }) => {
    // Wait for logs to load
    await page.waitForSelector('text=Execution Log', { timeout: 5000 })

    // Check that all 4 log types are displayed
    await expect(page.locator('text=🎯 Keywords')).toBeVisible()
    await expect(page.locator('text=✍️ Blog')).toBeVisible()
    await expect(page.locator('text=📊 Analytics')).toBeVisible()
    await expect(page.locator('text=📚 Blog Batch')).toBeVisible()

    // Verify company name appears
    await expect(page.locator('text=Test Company')).toHaveCount(4) // Should appear 4 times (once per log)
  })

  test('should display keywords log metadata', async ({ page }) => {
    // Find keywords log entry
    const keywordsLog = page.locator('text=🎯 Keywords').locator('..').locator('..').first()

    // Check metadata
    await expect(keywordsLog.locator('text=5 keywords')).toBeVisible()
    await expect(keywordsLog.locator('text=English')).toBeVisible()
    await expect(keywordsLog.locator('text=US')).toBeVisible()
    await expect(keywordsLog.locator('text=12.5s')).toBeVisible()
  })

  test('should display blog log metadata', async ({ page }) => {
    // Find blog log entry
    const blogLog = page.locator('text=✍️ Blog').locator('..').locator('..').first()

    // Check metadata
    await expect(blogLog.locator('text="test blog keyword"')).toBeVisible()
    await expect(blogLog.locator('text=1500 words')).toBeVisible()
    await expect(blogLog.locator('text=AEO: 78.5')).toBeVisible()
    await expect(blogLog.locator('text=45.2s')).toBeVisible()
  })

  test('should display analytics log metadata', async ({ page }) => {
    // Find analytics log entry
    const analyticsLog = page.locator('text=📊 Analytics').locator('..').locator('..').first()

    // Check metadata
    await expect(analyticsLog.locator('text=Health: 87.5/100')).toBeVisible()
    await expect(analyticsLog.locator('text=12 AI mentions')).toBeVisible()
    await expect(analyticsLog.locator('text=35.0s')).toBeVisible()
  })

  test('should display blog batch log metadata', async ({ page }) => {
    // Find blog batch log entry
    const batchLog = page.locator('text=📚 Blog Batch').locator('..').locator('..').first()

    // Check metadata
    await expect(batchLog.locator('text=Total: 10')).toBeVisible()
    await expect(batchLog.locator('text=9 succeeded')).toBeVisible()
    await expect(batchLog.locator('text=1 failed')).toBeVisible()
    await expect(batchLog.locator('text=180.5s')).toBeVisible()
  })

  test('should export keywords as CSV', async ({ page, context }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Find keywords log and click export
    const keywordsLog = page.locator('text=🎯 Keywords').locator('..').locator('..').first()
    await keywordsLog.locator('button:has-text("CSV")').click()

    // Wait for download
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/aeo-keywords-test-company-.*-2kw\.csv/)

    // Save and verify file content
    const path = await download.path()
    expect(path).toBeTruthy()

    if (path) {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('Keyword,AEO Type,Intent,Relevance,AI Citation,Competition')
      expect(content).toContain('test keyword 1')
      expect(content).toContain('test keyword 2')
      expect(content).toContain('informational')
      expect(content).toContain('transactional')
    }
  })

  test('should export blog as Markdown', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Find blog log and click export
    const blogLog = page.locator('text=✍️ Blog').locator('..').locator('..').first()
    await blogLog.locator('button:has-text("MD")').click()

    // Wait for download
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/blog-test-blog-keyword-.*\.md/)

    // Save and verify file content
    const path = await download.path()
    expect(path).toBeTruthy()

    if (path) {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('# Test Blog Title')
      expect(content).toContain('This is test content for the blog.')
    }
  })

  test('should export analytics as JSON', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Find analytics log and click export
    const analyticsLog = page.locator('text=📊 Analytics').locator('..').locator('..').first()
    await analyticsLog.locator('button:has-text("JSON")').click()

    // Wait for download
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/aeo-analytics-test-company-.*\.json/)

    // Save and verify file content
    const path = await download.path()
    expect(path).toBeTruthy()

    if (path) {
      const content = readFileSync(path, 'utf-8')
      const data = JSON.parse(content)
      expect(data.company).toBe('Test Company')
      expect(data.health.overall_score).toBe(87.5)
      expect(data.mentions.total_mentions).toBe(12)
    }
  })

  test('should export blog batch as CSV', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Find blog batch log and click export
    const batchLog = page.locator('text=📚 Blog Batch').locator('..').locator('..').first()
    await batchLog.locator('button:has-text("CSV")').click()

    // Wait for download
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/blog-batch-test-company-.*\.csv/)

    // Save and verify file content
    const path = await download.path()
    expect(path).toBeTruthy()

    if (path) {
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('Keyword,Title,Word Count,AEO Score,Status')
      expect(content).toContain('keyword 1')
      expect(content).toContain('keyword 2')
      expect(content).toContain('keyword 3')
      expect(content).toContain('success')
      expect(content).toContain('failed')
    }
  })

  test('should delete a log entry', async ({ page }) => {
    // Count initial logs
    const initialCount = await page.locator('text=Test Company').count()

    // Find first log entry and click delete
    const firstLog = page.locator('text=🎯 Keywords').locator('..').locator('..').first()
    await firstLog.locator('button').filter({ hasText: '' }).last().click() // Delete button (trash icon)

    // Wait for deletion (count should decrease)
    await page.waitForTimeout(500) // Give time for state update

    // Verify count decreased
    const newCount = await page.locator('text=Test Company').count()
    expect(newCount).toBe(initialCount - 1)
  })

  test('should clear all logs', async ({ page }) => {
    // Click clear all button
    await page.locator('button:has-text("Clear All")').click()

    // Confirm dialog (Playwright auto-accepts by default, but we can handle it)
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })

    // Wait for empty state
    await expect(page.locator('text=No executions yet')).toBeVisible()
    await expect(page.locator('text=Run keywords, blogs, or analytics to see results here')).toBeVisible()

    // Verify no logs remain
    await expect(page.locator('text=Test Company')).not.toBeVisible()
  })

  test('should handle empty state', async ({ page, context }) => {
    // Clear localStorage
    await context.addInitScript(() => {
      localStorage.removeItem('bulk-gpt-logs')
    })

    // Navigate to LOG page
    await page.goto('/log')

    // Verify empty state
    await expect(page.locator('text=No executions yet')).toBeVisible()
    await expect(page.locator('text=Run keywords, blogs, or analytics to see results here')).toBeVisible()
    await expect(page.locator('text=0 executions stored locally')).toBeVisible()
  })

  test('should display execution count in header', async ({ page }) => {
    // Check header shows correct count
    await expect(page.locator('text=4 executions stored locally')).toBeVisible()
  })
})

