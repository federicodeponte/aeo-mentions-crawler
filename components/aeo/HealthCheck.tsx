'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2, CheckCircle2, XCircle, AlertCircle, Download, FileText, Info } from 'lucide-react'
import { useContextStorage } from '@/hooks/useContextStorage'
import { generateHealthCheckPDF } from '@/lib/exports/aeo-report-generator'
import { generateHealthCheckExcel, downloadBlob } from '@/lib/exports/aeo-excel-generator'

interface HealthCheckResult {
  url: string
  score: number
  grade: string
  checks: {
    category: string
    name: string
    status: 'pass' | 'fail' | 'warning'
    message?: string
    recommendation?: string
    score: number
  }[]
  summary?: {
    total_checks: number
    passed: number
    failed: number
    warnings: number
  }
}

type FilterStatus = 'all' | 'pass' | 'fail' | 'warning'
type SortColumn = 'name' | 'category' | 'status' | 'score'
type SortDirection = 'asc' | 'desc'

export function HealthCheck() {
  const { businessContext, hasContext } = useContextStorage()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HealthCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Table filters and sorting
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  // Auto-populate URL from context on mount
  useEffect(() => {
    if (businessContext?.companyWebsite && !url) {
      setUrl(businessContext.companyWebsite)
    }
  }, [businessContext?.companyWebsite, url])

  const handleCheck = async () => {
    if (!url) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/aeo/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Health check failed')
      }

      setResult(data)
      // Expand all categories by default
      if (data.checks) {
        const categories = Array.from(new Set(data.checks.map((c: any) => c.category)))
        setExpandedCategories(categories)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run health check')
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600 dark:text-green-400'
    if (grade.startsWith('B')) return 'text-blue-600 dark:text-blue-400'
    if (grade.startsWith('C')) return 'text-yellow-600 dark:text-yellow-400'
    if (grade.startsWith('D')) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'fail':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Filtered and sorted checks
  const filteredAndSortedChecks = useMemo(() => {
    if (!result) return []

    let filtered = result.checks.filter(check => {
      // Filter by status
      if (filterStatus !== 'all' && check.status !== filterStatus) return false
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          check.name.toLowerCase().includes(query) ||
          check.category.toLowerCase().includes(query) ||
          check.message?.toLowerCase().includes(query)
        )
      }
      
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'category':
          comparison = a.category.localeCompare(b.category)
          break
        case 'status':
          const statusOrder = { fail: 0, warning: 1, pass: 2 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
        case 'score':
          comparison = a.score - b.score
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [result, filterStatus, searchQuery, sortColumn, sortDirection])

  // Group by category
  const groupedChecks = useMemo(() => {
    return filteredAndSortedChecks.reduce((acc, check) => {
      if (!acc[check.category]) {
        acc[check.category] = []
      }
      acc[check.category].push(check)
      return acc
    }, {} as Record<string, typeof filteredAndSortedChecks>)
  }, [filteredAndSortedChecks])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleExportPDF = () => {
    if (!result) return
    setExportingPDF(true)
    try {
      const blob = generateHealthCheckPDF(result)
      const filename = `aeo-health-${result.url.replace(/https?:\/\//, '').replace(/\//g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setExportingPDF(false)
    }
  }

  const handleExportExcel = () => {
    if (!result) return
    setExportingExcel(true)
    try {
      const blob = generateHealthCheckExcel(result)
      const filename = `aeo-health-${result.url.replace(/https?:\/\//, '').replace(/\//g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('Excel export failed:', error)
      alert('Failed to generate Excel. Please try again.')
    } finally {
      setExportingExcel(false)
    }
  }

  const fromContext = businessContext?.companyWebsite === url

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="health-url" className="flex items-center gap-2">
            Website URL *
            {fromContext && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                From context
              </span>
            )}
          </Label>
          <Input
            id="health-url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          {!hasContext && !url && (
            <p className="text-xs text-muted-foreground">
              Tip: Set your company website in the Context page for auto-fill
            </p>
          )}
        </div>

        <Button onClick={handleCheck} disabled={loading || !url} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Running Health Check...' : 'Run Health Check'}
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Overall AEO Health
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold">{result.score}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>
              <div className={`text-3xl font-bold ${getGradeColor(result.grade)}`}>
                {result.grade}
              </div>
            </div>

            <div className="mt-4">
              <Progress value={result.score} className="h-2" />
            </div>

            {result.summary && (
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Passed</div>
                  <div className="text-xl font-semibold text-green-600">
                    {result.summary.passed}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Warnings</div>
                  <div className="text-xl font-semibold text-yellow-600">
                    {result.summary.warnings}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Failed</div>
                  <div className="text-xl font-semibold text-red-600">
                    {result.summary.failed}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Export Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleExportPDF}
              disabled={exportingPDF}
            >
              {exportingPDF ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              {exportingPDF ? 'Generating PDF...' : 'Export PDF Report'}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleExportExcel}
              disabled={exportingExcel}
            >
              {exportingExcel ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exportingExcel ? 'Generating Excel...' : 'Export Excel Data'}
            </Button>
          </div>

          {/* Filters and Search */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search checks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === 'pass' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('pass')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Pass
                  </Button>
                  <Button
                    variant={filterStatus === 'warning' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('warning')}
                  >
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Warning
                  </Button>
                  <Button
                    variant={filterStatus === 'fail' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('fail')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Fail
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {filteredAndSortedChecks.length} of {result.checks.length} checks
              </div>
            </div>
          </Card>

          {/* Detailed Table by Category */}
          <Accordion
            type="multiple"
            value={expandedCategories}
            onValueChange={setExpandedCategories}
            className="space-y-4"
          >
            {Object.entries(groupedChecks).map(([category, checks]) => {
              const categoryStats = {
                total: checks.length,
                passed: checks.filter(c => c.status === 'pass').length,
                warnings: checks.filter(c => c.status === 'warning').length,
                failed: checks.filter(c => c.status === 'fail').length,
              }

              return (
                <AccordionItem key={category} value={category} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          ({categoryStats.total} checks)
                        </span>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span className="text-green-600">{categoryStats.passed} pass</span>
                        <span className="text-yellow-600">{categoryStats.warnings} warn</span>
                        <span className="text-red-600">{categoryStats.failed} fail</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%] cursor-pointer" onClick={() => handleSort('name')}>
                            Check Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                            Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="cursor-pointer text-right" onClick={() => handleSort('score')}>
                            Score {sortColumn === 'score' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checks.map((check, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{check.name}</div>
                                {check.message && (
                                  <div className="text-xs text-muted-foreground">
                                    {check.message}
                                  </div>
                                )}
                                {check.recommendation && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400">
                                    💡 {check.recommendation}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                                {getStatusIcon(check.status)}
                                {check.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-semibold ${getScoreColor(check.score)}`}>
                                {check.score}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      )}
    </div>
  )
}
