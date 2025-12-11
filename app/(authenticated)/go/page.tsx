/**
 * ABOUTME: Keyword generation page - generate keywords using OpenKeyword
 */

'use client'

import dynamic from 'next/dynamic'

const KeywordGenerator = dynamic(
  () => import('@/components/keywords/KeywordGenerator').then(mod => ({ default: mod.KeywordGenerator })),
  {
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Loading Keyword Generator...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export default function RunPage() {
  return <KeywordGenerator />
}
