/**
 * Context page for analyzing company websites
 * Extract business context from domain analysis
 */

'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { textSizes, containerPadding } from '@/lib/utils/responsive-utils'

// Lazy load context form
const ContextForm = dynamic(
  () => import('@/components/context/ContextForm').then(mod => ({ default: mod.ContextForm })),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
    ssr: false,
  }
)

export default function ContextPage() {
  return (
    <div className="h-full overflow-auto">
      <div className={cn(
        "container mx-auto max-w-3xl py-6 sm:py-8",
        containerPadding.md
      )}>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className={cn("font-bold mb-1", textSizes.lg)}>Company Context</h1>
            <p className={cn("text-muted-foreground", textSizes.xs)}>
              Analyze a website to extract company information for AEO optimization
            </p>
          </div>
          
          <ContextForm />
          
          {/* Help Section */}
          <div className={cn(
            "border border-border rounded-lg space-y-2",
            "p-3 sm:p-4"
          )}>
            <h3 className={cn("font-semibold text-foreground", textSizes.xs)}>
              Why Company Context Matters
            </h3>
            <ul className={cn(
              "text-muted-foreground space-y-1.5 list-disc list-inside",
              "text-[11px] sm:text-sm"
            )}>
              <li>AI extracts company info, products, and brand identity</li>
              <li>Powers strategic keyword generation for AI search engines</li>
              <li>Optimizes content for ChatGPT, Perplexity, Claude, and Gemini</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

