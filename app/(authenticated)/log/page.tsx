/**
 * LOG Page - Shows execution history from localStorage
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Trash2, Clock, Globe, Flag, BarChart3, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface HealthResult {
  overall_score: number
  category_scores: {
    technical_seo: number
    structured_data: number
    ai_crawler_readiness: number
    authority_signals: number
  }
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warning'
    score: number
  }>
}

interface MentionsResult {
  company_name: string
  total_mentions: number
  platform_results: Array<{
    platform: string
    found: boolean
    mentions: Array<{
      query: string
      mentioned: boolean
    }>
  }>
}

interface BlogBatchResult {
  keyword: string
  title: string
  word_count: number
  aeo_score: number
  status: 'success' | 'failed'
}

interface LogEntry {
  id: string
  type: 'keywords' | 'blog' | 'refresh' | 'analytics' | 'blog_batch'
  timestamp: string
  company: string
  url: string
  language?: string
  country?: string
  count?: number
  generationTime?: number
  keywords?: Array<{
    keyword: string
    aeo_type: string
    search_intent: string
    relevance_score: number
    ai_citation_potential: string
    competition_level: string
  }>
  keyword?: string
  wordCount?: number
  title?: string
  content?: string
  aeoScore?: number
  // Analytics-specific
  healthResult?: HealthResult | null
  mentionsResult?: MentionsResult | null
  // Blog batch-specific
  batchId?: string
  total?: number
  successful?: number
  failed?: number
  results?: BlogBatchResult[]
}

export default function LogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLogs = JSON.parse(localStorage.getItem('bulk-gpt-logs') || '[]')
      setLogs(storedLogs)
      setIsLoading(false)
    }
  }, [])

  const handleClearAll = () => {
    if (confirm('Clear all logs? This cannot be undone.')) {
      localStorage.removeItem('bulk-gpt-logs')
      setLogs([])
      toast.success('All logs cleared')
    }
  }

  const handleExport = (log: LogEntry) => {
    if (log.type === 'keywords' && log.keywords) {
      const csvContent = [
        ['Keyword', 'AEO Type', 'Intent', 'Relevance', 'AI Citation', 'Competition'].join(','),
        ...log.keywords.map(k => [
          `"${k.keyword}"`,
          k.aeo_type,
          k.search_intent,
          k.relevance_score,
          k.ai_citation_potential,
          k.competition_level
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const timestamp = new Date(log.timestamp).toISOString().split('T')[0]
      const companySlug = log.company.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      a.download = `aeo-keywords-${companySlug}-${timestamp}-${log.keywords.length}kw.csv`
      
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Keywords exported')
    } else if (log.type === 'blog' && log.content) {
      const markdown = `# ${log.title || log.keyword}\n\n${log.content}`
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const timestamp = new Date(log.timestamp).toISOString().split('T')[0]
      const keywordSlug = (log.keyword || '').replace(/[^a-z0-9]/gi, '-').toLowerCase()
      a.download = `blog-${keywordSlug}-${timestamp}.md`
      
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Blog exported as Markdown')
    } else if (log.type === 'analytics' && (log.healthResult || log.mentionsResult)) {
      // Export analytics results as JSON
      const analyticsData = {
        company: log.company,
        url: log.url,
        timestamp: log.timestamp,
        health: log.healthResult,
        mentions: log.mentionsResult,
      }
      
      const jsonContent = JSON.stringify(analyticsData, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const timestamp = new Date(log.timestamp).toISOString().split('T')[0]
      const companySlug = log.company.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      a.download = `aeo-analytics-${companySlug}-${timestamp}.json`
      
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Analytics exported')
    } else if (log.type === 'blog_batch' && log.results) {
      // Export batch results as CSV
      const csvContent = [
        ['Keyword', 'Title', 'Word Count', 'AEO Score', 'Status'].join(','),
        ...log.results.map(r => [
          `"${r.keyword}"`,
          `"${r.title}"`,
          r.word_count,
          r.aeo_score?.toFixed(1) || 'N/A',
          r.status
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const timestamp = new Date(log.timestamp).toISOString().split('T')[0]
      const companySlug = log.company.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      a.download = `blog-batch-${companySlug}-${timestamp}.csv`
      
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Blog batch exported')
    }
  }

  const handleDelete = (id: string) => {
    const updatedLogs = logs.filter(log => log.id !== id)
    setLogs(updatedLogs)
    localStorage.setItem('bulk-gpt-logs', JSON.stringify(updatedLogs))
    toast.success('Log entry deleted')
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-current border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading logs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Execution Log</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {logs.length} execution{logs.length !== 1 ? 's' : ''} stored locally
              </p>
            </div>
            {logs.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          {/* Empty State */}
          {logs.length === 0 && (
            <div className="border border-border/40 rounded-lg p-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No executions yet</h3>
              <p className="text-sm text-muted-foreground">
                Run keywords, blogs, or analytics to see results here
              </p>
            </div>
          )}

          {/* Log Entries */}
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border border-border/40 rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {log.type === 'keywords' && '🎯 Keywords'}
                        {log.type === 'blog' && '✍️ Blog'}
                        {log.type === 'blog_batch' && '📚 Blog Batch'}
                        {log.type === 'analytics' && '📊 Analytics'}
                        {log.type === 'refresh' && '🔄 Refresh'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {/* Company Info */}
                    <div>
                      <h3 className="font-semibold text-base">{log.company}</h3>
                      <a
                        href={log.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {log.url}
                      </a>
                    </div>

                    {/* Type-specific Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {/* Keywords metadata */}
                      {log.type === 'keywords' && (
                        <>
                          {log.count && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium text-foreground">{log.count}</span> keywords
                            </span>
                          )}
                          {log.language && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {log.language}
                            </span>
                          )}
                          {log.country && (
                            <span className="flex items-center gap-1">
                              <Flag className="h-3 w-3" />
                              {log.country}
                            </span>
                          )}
                        </>
                      )}

                      {/* Blog metadata */}
                      {log.type === 'blog' && (
                        <>
                          {log.keyword && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium text-foreground">"{log.keyword}"</span>
                            </span>
                          )}
                          {log.wordCount && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span className="font-medium text-foreground">{log.wordCount}</span> words
                            </span>
                          )}
                          {log.aeoScore && (
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              AEO: <span className="font-medium text-foreground">{log.aeoScore.toFixed(1)}</span>
                            </span>
                          )}
                        </>
                      )}

                      {/* Blog batch metadata */}
                      {log.type === 'blog_batch' && (
                        <>
                          <span className="flex items-center gap-1">
                            Total: <span className="font-medium text-foreground">{log.total}</span>
                          </span>
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            {log.successful} succeeded
                          </span>
                          {log.failed && log.failed > 0 && (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <XCircle className="h-3 w-3" />
                              {log.failed} failed
                            </span>
                          )}
                        </>
                      )}

                      {/* Analytics metadata */}
                      {log.type === 'analytics' && (
                        <>
                          {log.healthResult && (
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              Health: <span className="font-medium text-foreground">{log.healthResult.overall_score.toFixed(1)}/100</span>
                            </span>
                          )}
                          {log.mentionsResult && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {log.mentionsResult.total_mentions} AI mentions
                            </span>
                          )}
                          {!log.healthResult && !log.mentionsResult && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3" />
                              Partial results
                            </span>
                          )}
                        </>
                      )}

                      {/* Generation time (all types) */}
                      {log.generationTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.generationTime.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {((log.type === 'keywords' && log.keywords) || 
                      (log.type === 'blog' && log.content) ||
                      (log.type === 'analytics' && (log.healthResult || log.mentionsResult)) ||
                      (log.type === 'blog_batch' && log.results)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(log)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {log.type === 'keywords' && 'CSV'}
                        {log.type === 'blog' && 'MD'}
                        {log.type === 'analytics' && 'JSON'}
                        {log.type === 'blog_batch' && 'CSV'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(log.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
