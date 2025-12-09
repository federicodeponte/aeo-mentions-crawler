/**
 * ABOUTME: Reusable animated progress bar component
 * ABOUTME: Used for AI optimization and test operations
 */

'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  /** Whether the progress bar should be animating */
  isActive: boolean
  /** Estimated duration in milliseconds */
  estimatedDuration: number
  /** Optional start time (for time-based progress) */
  startTime?: number
  /** Optional actual progress (0-100), overrides time-based calculation */
  actualProgress?: number
  /** Height of the progress bar */
  height?: 'sm' | 'md' | 'lg'
  /** Custom className for the container */
  className?: string
  /** Show progress percentage text */
  showPercentage?: boolean
}

export function ProgressBar({
  isActive,
  estimatedDuration,
  startTime,
  actualProgress,
  height = 'md',
  className = '',
  showPercentage = false,
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setProgress(0)
      return
    }

    // If actual progress is provided, use it directly
    if (actualProgress !== undefined) {
      setProgress(Math.min(100, Math.max(0, actualProgress)))
      return
    }

    // Otherwise, calculate based on elapsed time
    if (!startTime) {
      setProgress(0)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min(95, (elapsed / estimatedDuration) * 100) // Cap at 95% until complete
      setProgress(newProgress)
    }, 50) // Update every 50ms for smooth animation

    return () => clearInterval(interval)
  }, [isActive, estimatedDuration, startTime, actualProgress])

  // Height classes
  const heightClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  }

  // Determine if progress is complete (100%)
  const isComplete = actualProgress !== undefined ? actualProgress >= 100 : progress >= 100
  
  // Format progress percentage
  const progressPercentage = Math.round(actualProgress !== undefined ? actualProgress : progress)

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showPercentage && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className={cn(
            'font-medium',
            isComplete ? 'text-green-600' : 'text-primary'
          )}>
            {progressPercentage}%
          </span>
        </div>
      )}
      
      <div className={cn(
        'w-full rounded-full overflow-hidden transition-all duration-300',
        heightClasses[height],
        isComplete ? 'bg-green-600/20' : 'bg-primary/20'
      )}>
        <div 
          className={cn(
            'h-full rounded-full transition-all ease-out duration-300',
            isComplete ? 'bg-green-600' : 'bg-primary'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

