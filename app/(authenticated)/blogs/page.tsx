'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load blog generator
const BlogGenerator = dynamic(
  () => import('@/components/blogs/BlogGenerator').then(mod => ({ default: mod.BlogGenerator })),
  {
    loading: () => <Skeleton className="h-full w-full" />,
    ssr: false,
  }
)

export default function BlogsPage() {
  return (
    <div className="h-full overflow-hidden">
      <BlogGenerator />
    </div>
  )
}

