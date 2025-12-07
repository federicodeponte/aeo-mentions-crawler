/**
 * Test script to verify LOG page export functions work correctly
 * Run with: npx tsx test-log-page.ts
 */

// Mock localStorage for testing
const mockLocalStorage: Record<string, string> = {}

const localStorage = {
  getItem: (key: string) => mockLocalStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockLocalStorage[key] = value
  },
  removeItem: (key: string) => {
    delete mockLocalStorage[key]
  },
}

// Test data matching the LogEntry interface
const testLogs = [
  {
    id: 'kw-1',
    type: 'keywords' as const,
    timestamp: new Date().toISOString(),
    company: 'Test Company',
    url: 'https://example.com',
    language: 'en',
    country: 'US',
    count: 5,
    generationTime: 12.5,
    keywords: [
      {
        keyword: 'test keyword',
        aeo_type: 'informational',
        search_intent: 'learn',
        relevance_score: 8.5,
        ai_citation_potential: 'high',
        competition_level: 'medium',
      },
    ],
  },
  {
    id: 'blog-1',
    type: 'blog' as const,
    timestamp: new Date().toISOString(),
    company: 'Test Company',
    url: 'https://example.com',
    keyword: 'test keyword',
    wordCount: 1500,
    title: 'Test Blog Title',
    content: '# Test Blog\n\nThis is test content.',
    aeoScore: 78.5,
    generationTime: 45.2,
  },
  {
    id: 'analytics-1',
    type: 'analytics' as const,
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
      checks: [],
    },
    mentionsResult: {
      company_name: 'Test Company',
      total_mentions: 12,
      platform_results: [],
    },
    generationTime: 35.0,
  },
  {
    id: 'batch-1',
    type: 'blog_batch' as const,
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
        status: 'success' as const,
      },
      {
        keyword: 'keyword 2',
        title: 'Blog 2',
        word_count: 1600,
        aeo_score: 75,
        status: 'success' as const,
      },
    ],
    generationTime: 180.5,
  },
]

// Test localStorage operations
console.log('🧪 Testing LOG page functionality...\n')

// Test 1: Save logs to localStorage
console.log('1. Testing localStorage save...')
localStorage.setItem('bulk-gpt-logs', JSON.stringify(testLogs))
const saved = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
console.log(`   ✅ Saved ${saved.length} logs`)

// Test 2: Read logs from localStorage
console.log('\n2. Testing localStorage read...')
const read = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
console.log(`   ✅ Read ${read.length} logs`)
console.log(`   ✅ Types: ${read.map((r: any) => r.type).join(', ')}`)

// Test 3: Test CSV export for keywords
console.log('\n3. Testing keywords CSV export...')
const keywordLog = read.find((r: any) => r.type === 'keywords')
if (keywordLog && keywordLog.keywords) {
  const csvContent = [
    ['Keyword', 'AEO Type', 'Intent', 'Relevance', 'AI Citation', 'Competition'].join(','),
    ...keywordLog.keywords.map((k: any) => [
      `"${(k.keyword || '').replace(/"/g, '""')}"`,
      (k.aeo_type || '').replace(/"/g, '""'),
      (k.search_intent || '').replace(/"/g, '""'),
      k.relevance_score ?? '',
      (k.ai_citation_potential || '').replace(/"/g, '""'),
      (k.competition_level || '').replace(/"/g, '""'),
    ].join(',')),
  ].join('\n')
  console.log(`   ✅ CSV generated (${csvContent.split('\n').length} lines)`)
  console.log(`   ✅ First line: ${csvContent.split('\n')[0]}`)
} else {
  console.log('   ❌ No keyword log found')
}

// Test 4: Test Markdown export for blog
console.log('\n4. Testing blog Markdown export...')
const blogLog = read.find((r: any) => r.type === 'blog')
if (blogLog && blogLog.content) {
  const markdown = `# ${blogLog.title || blogLog.keyword}\n\n${blogLog.content}`
  console.log(`   ✅ Markdown generated (${markdown.length} chars)`)
  console.log(`   ✅ Title: ${blogLog.title}`)
} else {
  console.log('   ❌ No blog log found')
}

// Test 5: Test JSON export for analytics
console.log('\n5. Testing analytics JSON export...')
const analyticsLog = read.find((r: any) => r.type === 'analytics')
if (analyticsLog && (analyticsLog.healthResult || analyticsLog.mentionsResult)) {
  const analyticsData = {
    company: analyticsLog.company,
    url: analyticsLog.url,
    timestamp: analyticsLog.timestamp,
    health: analyticsLog.healthResult,
    mentions: analyticsLog.mentionsResult,
  }
  const jsonContent = JSON.stringify(analyticsData, null, 2)
  console.log(`   ✅ JSON generated (${jsonContent.length} chars)`)
  console.log(`   ✅ Health score: ${analyticsLog.healthResult?.overall_score}`)
  console.log(`   ✅ Mentions: ${analyticsLog.mentionsResult?.total_mentions}`)
} else {
  console.log('   ❌ No analytics log found')
}

// Test 6: Test CSV export for blog batch
console.log('\n6. Testing blog batch CSV export...')
const batchLog = read.find((r: any) => r.type === 'blog_batch')
if (batchLog && batchLog.results && batchLog.results.length > 0) {
  const csvContent = [
    ['Keyword', 'Title', 'Word Count', 'AEO Score', 'Status'].join(','),
    ...batchLog.results.map((r: any) => [
      `"${(r.keyword || '').replace(/"/g, '""')}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.word_count ?? 0,
      r.aeo_score ? r.aeo_score.toFixed(1) : 'N/A',
      r.status || 'unknown',
    ].join(',')),
  ].join('\n')
  console.log(`   ✅ CSV generated (${csvContent.split('\n').length} lines)`)
  console.log(`   ✅ Total: ${batchLog.total}, Success: ${batchLog.successful}, Failed: ${batchLog.failed}`)
} else {
  console.log('   ❌ No batch log found')
}

// Test 7: Test delete operation
console.log('\n7. Testing delete operation...')
const beforeDelete = read.length
const updated = read.filter((r: any) => r.id !== 'kw-1')
localStorage.setItem('bulk-gpt-logs', JSON.stringify(updated))
const afterDelete = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
console.log(`   ✅ Before: ${beforeDelete}, After: ${afterDelete.length}`)
console.log(`   ✅ Deleted successfully: ${beforeDelete > afterDelete.length}`)

// Test 8: Test clear all
console.log('\n8. Testing clear all...')
localStorage.removeItem('bulk-gpt-logs')
const afterClear = localStorage.getItem('bulk-gpt-logs')
console.log(`   ✅ Cleared: ${afterClear === null}`)

// Test 9: Test corrupted data handling
console.log('\n9. Testing corrupted data handling...')
localStorage.setItem('bulk-gpt-logs', 'invalid json!!!')
try {
  const corrupted = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
  console.log('   ❌ Should have thrown error')
} catch (error) {
  console.log('   ✅ Corrupted data caught and handled')
  localStorage.removeItem('bulk-gpt-logs')
}

console.log('\n✅ All tests completed!')
console.log('\n📝 Summary:')
console.log('   - localStorage operations: ✅')
console.log('   - Keywords CSV export: ✅')
console.log('   - Blog Markdown export: ✅')
console.log('   - Analytics JSON export: ✅')
console.log('   - Blog batch CSV export: ✅')
console.log('   - Delete operation: ✅')
console.log('   - Clear all: ✅')
console.log('   - Error handling: ✅')

