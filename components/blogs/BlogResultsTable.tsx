/**
 * Blog Results Table with Expandable Rows
 * Shows enhanced blog data similar to KeywordGenerator
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Citation {
  id: number
  type: string
  source: string
  url: string
  text: string
}

interface InternalLink {
  anchor_text: string
  target_slug: string
  target_title: string
  url?: string
}

interface FAQItem {
  question: string
  answer: string
}

interface PAAItem {
  question: string
  answer: string
}

interface BlogResult {
  title: string
  content: string
  metadata: {
    keyword: string
    word_count: number
    generation_time: number
    company_name: string
    company_url: string
    aeo_score?: number
    job_id?: string
    slug?: string
  }
  
  // Enhanced data
  meta_title?: string
  meta_description?: string
  citations?: Citation[]
  citations_count?: number
  internal_links?: InternalLink[]
  internal_links_count?: number
  toc?: Record<string, string>
  faq?: FAQItem[]
  faq_count?: number
  paa?: PAAItem[]
  paa_count?: number
  image_url?: string
  image_alt_text?: string
  image_prompt?: string
  publication_date?: string
  read_time_minutes?: number
}

interface BlogResultsTableProps {
  result: BlogResult
  onDownload: () => void
}

export function BlogResultsTable({ result, onDownload }: BlogResultsTableProps) {
  const [expanded, setExpanded] = useState(false)

  const hasEnhancedData = 
    (result.citations_count && result.citations_count > 0) ||
    (result.internal_links_count && result.internal_links_count > 0) ||
    (result.faq_count && result.faq_count > 0) ||
    (result.paa_count && result.paa_count > 0) ||
    result.image_url ||
    result.meta_title

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Main Row */}
      <div className="flex items-center justify-between p-4 bg-background hover:bg-muted/30 transition-colors">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold">{result.title}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Success
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{result.metadata.word_count} words</span>
            {result.read_time_minutes && (
              <>
                <span>•</span>
                <span>{result.read_time_minutes} min read</span>
              </>
            )}
            <span>•</span>
            <span>{result.metadata.generation_time.toFixed(1)}s</span>
            {result.metadata.aeo_score !== undefined && (
              <>
                <span>•</span>
                <span className="font-medium text-primary">AEO: {result.metadata.aeo_score}/100</span>
              </>
            )}
            {result.citations_count && result.citations_count > 0 && (
              <>
                <span>•</span>
                <span>{result.citations_count} citations</span>
              </>
            )}
            {result.faq_count && result.faq_count > 0 && (
              <>
                <span>•</span>
                <span>{result.faq_count} FAQs</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
          {hasEnhancedData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && hasEnhancedData && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-4">
          {/* Meta Tags */}
          {(result.meta_title || result.meta_description) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">📝 Meta Tags</h4>
              <div className="space-y-1 text-xs">
                {result.meta_title && (
                  <div>
                    <span className="text-muted-foreground">Title:</span>{' '}
                    <span className="font-medium">{result.meta_title}</span>
                  </div>
                )}
                {result.meta_description && (
                  <div>
                    <span className="text-muted-foreground">Description:</span>{' '}
                    <span>{result.meta_description}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image */}
          {result.image_url && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">🖼️ Featured Image</h4>
              <div className="space-y-1 text-xs">
                <div>
                  <a 
                    href={result.image_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View Image <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {result.image_alt_text && (
                  <div>
                    <span className="text-muted-foreground">Alt Text:</span>{' '}
                    <span>{result.image_alt_text}</span>
                  </div>
                )}
                {result.image_prompt && (
                  <div>
                    <span className="text-muted-foreground">Prompt:</span>{' '}
                    <span className="italic">{result.image_prompt}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Citations */}
          {result.citations && result.citations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">📚 Citations ({result.citations.length})</h4>
              <div className="space-y-2">
                {result.citations.slice(0, 5).map((citation, idx) => (
                  <div key={idx} className="text-xs border-l-2 border-primary/30 pl-2">
                    <div className="font-medium">{citation.source}</div>
                    {citation.url && (
                      <a 
                        href={citation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {citation.url.length > 60 ? citation.url.substring(0, 60) + '...' : citation.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {citation.text && (
                      <div className="text-muted-foreground italic mt-1">"{citation.text.substring(0, 100)}..."</div>
                    )}
                  </div>
                ))}
                {result.citations.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    + {result.citations.length - 5} more citations
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Links */}
          {result.internal_links && result.internal_links.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">🔗 Internal Links ({result.internal_links.length})</h4>
              <div className="space-y-1">
                {result.internal_links.map((link, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-muted-foreground">{link.anchor_text}</span>
                    {' → '}
                    <span className="font-medium">{link.target_title || link.target_slug}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {result.faq && result.faq.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">❓ FAQ ({result.faq.length})</h4>
              <div className="space-y-2">
                {result.faq.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-xs border-l-2 border-primary/30 pl-2">
                    <div className="font-medium">{item.question}</div>
                    <div className="text-muted-foreground">{item.answer.substring(0, 100)}...</div>
                  </div>
                ))}
                {result.faq.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    + {result.faq.length - 3} more FAQs
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAA */}
          {result.paa && result.paa.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">💬 People Also Ask ({result.paa.length})</h4>
              <div className="space-y-2">
                {result.paa.map((item, idx) => (
                  <div key={idx} className="text-xs border-l-2 border-primary/30 pl-2">
                    <div className="font-medium">{item.question}</div>
                    <div className="text-muted-foreground">{item.answer.substring(0, 100)}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

