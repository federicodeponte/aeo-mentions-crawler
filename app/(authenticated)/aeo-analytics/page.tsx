'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HealthCheck } from '@/components/aeo/HealthCheck'
import { MentionsCheck } from '@/components/aeo/MentionsCheck'

export default function AEOAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('health')

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AEO Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze your AEO performance with health checks and mentions tracking
        </p>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="health">
              <span className="flex items-center gap-2">
                <span>🏥</span>
                <span>AEO Health</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="mentions">
              <span className="flex items-center gap-2">
                <span>🔍</span>
                <span>AEO Mentions</span>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="mt-0">
            <HealthCheck />
          </TabsContent>

          <TabsContent value="mentions" className="mt-0">
            <MentionsCheck />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

