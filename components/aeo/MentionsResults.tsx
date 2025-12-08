'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { generateMentionsReportPdf } from '@/lib/exports/aeo-report-generator'
import { generateMentionsExcel } from '@/lib/exports/aeo-excel-generator'

interface MentionsResultsProps {
  result: any
  companyName: string
}

type FilterMention = 'all' | 'mentioned' | 'not_mentioned'
type SortColumn = 'query' | 'platform' | 'mentions' | 'quality'
type SortDirection = 'asc' | 'desc'

export function MentionsResults({ result, companyName }: MentionsResultsProps) {
  const [expandedResults, setExpandedResults] = useState<string[]>([])
  const [filterMention, setFilterMention] = useState<FilterMention>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('quality')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  const handleExportPDF = async () => {
    setExportingPDF(true)
    try {
      const blob = await generateMentionsReportPdf(result, companyName)
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `aeo-mentions-${companyName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExportingPDF(false)
    }
  }

  const handleExportExcel = async () => {
    setExportingExcel(true)
    try {
      const blob = await generateMentionsExcel(result, companyName)
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `aeo-mentions-${companyName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExportingExcel(false)
    }
  }

  const getBandColor = (band: string) => {
    const colors: Record<string, string> = {
      Dominant: 'text-purple-600 bg-purple-50 border-purple-200',
      Strong: 'text-green-600 bg-green-50 border-green-200',
      Moderate: 'text-blue-600 bg-blue-50 border-blue-200',
      Weak: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      Invisible: 'text-red-600 bg-red-50 border-red-200',
    }
    return colors[band] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  // Filter and sort query results
  const filteredResults = result.query_results.filter((qr: any) => {
    if (filterMention === 'mentioned' && qr.capped_mentions === 0) return false
    if (filterMention === 'not_mentioned' && qr.capped_mentions > 0) return false
    if (searchQuery && !qr.query.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    let comparison = 0
    switch (sortColumn) {
      case 'query':
        comparison = a.query.localeCompare(b.query)
        break
      case 'platform':
        comparison = a.platform.localeCompare(b.platform)
        break
      case 'mentions':
        comparison = a.capped_mentions - b.capped_mentions
        break
      case 'quality':
        comparison = a.quality_score - b.quality_score
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  return (
    <div className="space-y-8">
      {/* Score Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              AEO Visibility Score
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-3xl font-bold">
                {result.visibility}%
              </span>
              <Badge className={getBandColor(result.band)}>
                {result.band}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="w-20">
              <Progress value={result.visibility} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <div className="text-lg font-semibold">{result.presence_rate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Presence Rate</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{result.quality_score.toFixed(1)}/10</div>
            <div className="text-xs text-muted-foreground">Avg Quality</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{result.mentions}</div>
            <div className="text-xs text-muted-foreground">Total Mentions</div>
          </div>
        </div>
      </Card>

      {/* Platform Performance */}
      {result.platform_stats && (
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Platform Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(result.platform_stats).map(([platform, stats]: [string, any]) => (
              <div key={platform} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{platform}</span>
                  <Badge variant="outline" className="text-xs">
                    {stats.responses}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Mentions</span>
                    <span className="text-sm font-medium">{stats.mentions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Quality</span>
                    <span className="text-sm font-medium">{stats.quality_score.toFixed(1)}/10</span>
                  </div>
                  <Progress value={(stats.quality_score / 10) * 100} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Export Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={handleExportPDF}
          disabled={exportingPDF}
        >
          {exportingPDF ? (
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          ) : (
            <FileText className="mr-2 w-4 h-4" />
          )}
          {exportingPDF ? 'Exporting...' : 'Export PDF'}
        </Button>
        <Button 
          variant="outline" 
          onClick={handleExportExcel}
          disabled={exportingExcel}
        >
          {exportingExcel ? (
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          ) : (
            <Download className="mr-2 w-4 h-4" />
          )}
          {exportingExcel ? 'Exporting...' : 'Export Excel'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search queries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterMention === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMention('all')}
            >
              All
            </Button>
            <Button
              variant={filterMention === 'mentioned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMention('mentioned')}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mentioned
            </Button>
            <Button
              variant={filterMention === 'not_mentioned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMention('not_mentioned')}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Not Mentioned
            </Button>
          </div>
        </div>
      </Card>

      {/* Query Results */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="mb-3 text-left">Query Results ({sortedResults.length})</CardTitle>
          <CardDescription className="text-left">
            Detailed AI responses for each query × platform combination
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Accordion type="multiple" value={expandedResults} onValueChange={setExpandedResults}>
            {sortedResults.map((qr: any, idx: number) => (
              <AccordionItem key={idx} value={`result-${idx}`} className="border rounded-lg mb-2">
                <AccordionTrigger className="hover:no-underline px-4 py-3 text-left">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3 text-left">
                      <Badge variant={qr.capped_mentions > 0 ? 'default' : 'outline'} className="shrink-0">
                        {qr.platform}
                      </Badge>
                      <span className="font-medium text-left truncate">{qr.query}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm shrink-0 ml-4">
                      <span className="text-muted-foreground">
                        {qr.capped_mentions || qr.mentions || 0} mention{(qr.capped_mentions || qr.mentions || 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="font-medium">
                        Q: {(qr.quality_score || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">
                    {/* AI Response */}
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        AI Response:
                      </h4>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {qr.response_text || qr.response || 'No response recorded'}
                      </div>
                    </div>
                    
                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-xs text-muted-foreground">Mentions</div>
                        <div className="text-lg font-semibold">{qr.raw_mentions || qr.mentions || qr.capped_mentions || 0}</div>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-xs text-muted-foreground">Quality</div>
                        <div className="text-lg font-semibold">{(qr.quality_score || 0).toFixed(1)}</div>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-xs text-muted-foreground">Type</div>
                        <div className="text-sm font-medium capitalize">{qr.mention_type || 'N/A'}</div>
                      </div>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-xs text-muted-foreground">Dimension</div>
                        <div className="text-sm font-medium capitalize">{qr.dimension || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Competitor Mentions */}
                    {qr.competitor_mentions && qr.competitor_mentions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                          Also Mentioned:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {qr.competitor_mentions.map((comp: any, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {comp.name} ({comp.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
