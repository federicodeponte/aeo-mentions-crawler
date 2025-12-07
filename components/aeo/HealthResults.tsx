'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
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
  AlertCircle,
  Loader2,
  FileText,
  Download,
} from 'lucide-react'
import { generateHealthReportPdf } from '@/lib/exports/aeo-report-generator'
import { generateHealthExcel } from '@/lib/exports/aeo-excel-generator'

interface HealthResultsProps {
  result: any
  url: string
}

type FilterStatus = 'all' | 'pass' | 'warning' | 'fail'

export function HealthResults({ result, url }: HealthResultsProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  const handleExportPDF = async () => {
    setExportingPDF(true)
    try {
      const blob = await generateHealthReportPdf(result, url)
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `aeo-health-${url.replace(/^https?:\/\//, '').replace(/\//g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
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
      const blob = await generateHealthExcel(result, url)
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `aeo-health-${url.replace(/^https?:\/\//, '').replace(/\//g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExportingExcel(false)
    }
  }

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'A+': 'text-green-600',
      A: 'text-green-600',
      B: 'text-blue-600',
      C: 'text-yellow-600',
      D: 'text-orange-600',
      F: 'text-red-600',
    }
    return colors[grade] || 'text-gray-600'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  // Filter and group checks
  const filteredChecks = result.checks.filter((check: any) => {
    if (filterStatus !== 'all' && check.status !== filterStatus) return false
    if (searchQuery && !check.check.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const groupedChecks = filteredChecks.reduce((acc: Record<string, any[]>, check: any) => {
    if (!acc[check.category]) acc[check.category] = []
    acc[check.category].push(check)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              AEO Health Score
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

      {/* Filters */}
      <Card className="p-4">
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
      </Card>

      {/* Results by Category */}
      <Accordion type="multiple" value={expandedCategories} onValueChange={setExpandedCategories}>
        {Object.entries(groupedChecks).map(([category, checks]: [string, any[]]) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold">{category}</span>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-600">
                    {checks.filter(c => c.status === 'pass').length} pass
                  </span>
                  <span className="text-yellow-600">
                    {checks.filter(c => c.status === 'warning').length} warn
                  </span>
                  <span className="text-red-600">
                    {checks.filter(c => c.status === 'fail').length} fail
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Check</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((check: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{getStatusIcon(check.status)}</TableCell>
                      <TableCell className="font-medium">{check.check}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {check.message}
                      </TableCell>
                      <TableCell className="text-sm">{check.recommendation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
