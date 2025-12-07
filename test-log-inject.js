/**
 * Quick test script to inject data and verify LOG page
 * Run: node test-log-inject.js
 */

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Inject test data
  const testLogs = [
    {
      id: 'kw-test-1',
      type: 'keywords',
      timestamp: new Date().toISOString(),
      company: 'SCAILE Technologies',
      url: 'https://scaile.tech',
      language: 'en',
      country: 'US',
      count: 25,
      generationTime: 18.5,
      keywords: [
        { keyword: 'answer engine optimization', aeo_type: 'informational', search_intent: 'learn', relevance_score: 9.5, ai_citation_potential: 'very high', competition_level: 'low' },
        { keyword: 'AEO best practices', aeo_type: 'informational', search_intent: 'learn', relevance_score: 9.0, ai_citation_potential: 'high', competition_level: 'medium' }
      ]
    },
    {
      id: 'blog-test-1',
      type: 'blog',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      company: 'SCAILE Technologies',
      url: 'https://scaile.tech',
      keyword: 'answer engine optimization guide',
      wordCount: 1850,
      title: 'Complete Guide to Answer Engine Optimization (AEO) in 2025',
      content: '# Complete Guide to Answer Engine Optimization (AEO) in 2025\n\nAnswer Engine Optimization (AEO) is the practice...',
      aeoScore: 82.5,
      generationTime: 67.3
    },
    {
      id: 'analytics-test-1',
      type: 'analytics',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      company: 'SCAILE Technologies',
      url: 'https://scaile.tech',
      healthResult: {
        overall_score: 89.2,
        category_scores: {
          technical_seo: 92,
          structured_data: 88,
          ai_crawler_readiness: 91,
          authority_signals: 86
        },
        checks: []
      },
      mentionsResult: {
        company_name: 'SCAILE Technologies',
        total_mentions: 15,
        platform_results: []
      },
      generationTime: 42.8
    },
    {
      id: 'batch-test-1',
      type: 'blog_batch',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      company: 'SCAILE Technologies',
      url: 'https://scaile.tech',
      batchId: 'batch-abc123',
      total: 12,
      successful: 11,
      failed: 1,
      results: [
        { keyword: 'AEO strategy', title: 'How to Build an Effective AEO Strategy', word_count: 1650, aeo_score: 79.5, status: 'success' },
        { keyword: 'AI search visibility', title: 'Maximizing Your AI Search Visibility', word_count: 1720, aeo_score: 81.2, status: 'success' }
      ],
      generationTime: 245.7
    }
  ];

  // Navigate and inject data
  await page.goto('http://localhost:3334/log');
  await page.evaluate((logs) => {
    localStorage.setItem('bulk-gpt-logs', JSON.stringify(logs));
  }, testLogs);
  
  // Reload page to see the data
  await page.reload();
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'log-page-with-data.png', fullPage: true });
  console.log('✅ Screenshot saved: log-page-with-data.png');

  // Check if logs are displayed
  const logCount = await page.locator('text=SCAILE Technologies').count();
  console.log(`✅ Found ${logCount} log entries displayed`);

  // Check for all log types
  const hasKeywords = await page.locator('text=🎯 Keywords').isVisible();
  const hasBlog = await page.locator('text=✍️ Blog').isVisible();
  const hasAnalytics = await page.locator('text=📊 Analytics').isVisible();
  const hasBatch = await page.locator('text=📚 Blog Batch').isVisible();

  console.log(`✅ Keywords log: ${hasKeywords ? 'VISIBLE' : 'NOT VISIBLE'}`);
  console.log(`✅ Blog log: ${hasBlog ? 'VISIBLE' : 'NOT VISIBLE'}`);
  console.log(`✅ Analytics log: ${hasAnalytics ? 'VISIBLE' : 'NOT VISIBLE'}`);
  console.log(`✅ Blog batch log: ${hasBatch ? 'VISIBLE' : 'NOT VISIBLE'}`);

  // Keep browser open for 5 seconds to see results
  await page.waitForTimeout(5000);

  await browser.close();
})();

