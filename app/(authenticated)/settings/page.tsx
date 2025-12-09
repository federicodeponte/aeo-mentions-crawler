'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Check, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { textSizes, containerPadding } from '@/lib/utils/responsive-utils'

export default function SettingsPage() {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [openrouterApiKey, setOpenrouterApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Load API keys on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedGemini = localStorage.getItem('gemini-api-key')
      const storedOpenrouter = localStorage.getItem('openrouter-api-key')
      if (storedGemini) {
        setGeminiApiKey(storedGemini)
      }
      if (storedOpenrouter) {
        setOpenrouterApiKey(storedOpenrouter)
      }
    }
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (typeof window !== 'undefined') {
        // Save Gemini API key
        if (geminiApiKey.trim()) {
          localStorage.setItem('gemini-api-key', geminiApiKey.trim())
        } else {
          localStorage.removeItem('gemini-api-key')
        }
        
        // Save OpenRouter API key
        if (openrouterApiKey.trim()) {
          localStorage.setItem('openrouter-api-key', openrouterApiKey.trim())
        } else {
          localStorage.removeItem('openrouter-api-key')
        }
      }

      setIsSaved(true)
      setTimeout(() => {
        setIsSaved(false)
      }, 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full bg-background overflow-auto">
      <div className={cn(
        "container mx-auto max-w-2xl py-6 sm:py-8",
        containerPadding.md
      )}>
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className={cn("font-bold tracking-tight", textSizes.lg)}>Settings</h1>
            <p className={cn("text-muted-foreground", textSizes.xs)}>
              Configure your API keys and preferences
            </p>
          </div>

          {/* API Keys Section */}
          <div className={cn(
            "rounded-lg border border-border bg-card space-y-4 sm:space-y-6",
            "p-4 sm:p-6"
          )}>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h2 className={cn("font-semibold", textSizes.base)}>API Keys</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
              {/* Gemini API Key */}
              <div className="space-y-2">
                <Label htmlFor="gemini-api-key" className={cn("font-medium", textSizes.xs)}>
                  Gemini API Key
                </Label>
                <Input
                  id="gemini-api-key"
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  disabled={isSaving}
                  className={cn("font-mono h-8 sm:h-10", textSizes.xs)}
                />
                <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
                  Required for keyword generation and website analysis. Get your free key from{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              {/* OpenRouter API Key */}
              <div className="space-y-2">
                <Label htmlFor="openrouter-api-key" className={cn("font-medium", textSizes.xs)}>
                  OpenRouter API Key
                </Label>
                <Input
                  id="openrouter-api-key"
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openrouterApiKey}
                  onChange={(e) => setOpenrouterApiKey(e.target.value)}
                  disabled={isSaving}
                  className={cn("font-mono h-8 sm:h-10", textSizes.xs)}
                />
                <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
                  Required for AEO Mentions check. Get your key from{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSaving || (!geminiApiKey.trim() && !openrouterApiKey.trim())}
                  className={cn("gap-2 h-8 sm:h-10", textSizes.xs)}
                >
                  {isSaved ? (
                    <>
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                      Saved
                    </>
                  ) : isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                      Save API Keys
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Success Message */}
            {isSaved && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <p className={cn(
                  "text-green-600 dark:text-green-400 flex items-center gap-2",
                  textSizes.xs
                )}>
                  <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  API keys saved successfully!
                </p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className={cn(
            "rounded-lg border border-blue-500/20 bg-blue-500/10",
            "p-3 sm:p-4"
          )}>
            <h3 className={cn(
              "font-medium text-blue-600 dark:text-blue-400 mb-2",
              textSizes.xs
            )}>
              🔐 Your API Key is Secure
            </h3>
            <p className={cn("text-muted-foreground", "text-[10px] sm:text-xs")}>
              Your API key is stored locally in your browser only. It's never sent to our servers
              and is only used for direct communication with Google's AI services.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

