'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Option {
  value: string
  label: string
  searchTerms?: string[] // Additional search terms for better matching
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showRecentSelections?: boolean // Show recently selected options first
  maxRecentItems?: number // Max recent items to show
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  disabled = false,
  className,
  showRecentSelections = true,
  maxRecentItems = 5,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  // Recent selections management
  const getStorageKey = () => `searchable-select-recent-${placeholder?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'default'}`
  
  const [recentSelections, setRecentSelections] = React.useState<string[]>(() => {
    if (!showRecentSelections || typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(getStorageKey())
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  
  // Add to recent selections when value changes
  React.useEffect(() => {
    if (!showRecentSelections || !value || typeof window === 'undefined') return
    
    const newRecent = [value, ...recentSelections.filter(item => item !== value)]
      .slice(0, maxRecentItems)
    
    if (JSON.stringify(newRecent) !== JSON.stringify(recentSelections)) {
      setRecentSelections(newRecent)
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(newRecent))
      } catch {
        // Storage failed, continue without recent selections
      }
    }
  }, [value, showRecentSelections, maxRecentItems])

  const selectedOption = options.find((option) => option.value === value)

  // Enhanced filtering with searchTerms support and better matching
  const filteredOptions = React.useMemo(() => {
    if (!search) {
      // No search: show recent selections first, then all options
      if (!showRecentSelections || recentSelections.length === 0) {
        return options
      }
      
      const recentOptions = recentSelections
        .map(recent => options.find(opt => opt.value === recent))
        .filter(Boolean) as Option[]
      
      const otherOptions = options.filter(opt => !recentSelections.includes(opt.value))
      
      return [...recentOptions, ...otherOptions]
    }
    
    const searchLower = search.toLowerCase()
    
    return options.filter((option) => {
      // Check label
      if (option.label.toLowerCase().includes(searchLower)) return true
      
      // Check value/code
      if (option.value.toLowerCase().includes(searchLower)) return true
      
      // Check additional search terms
      if (option.searchTerms) {
        return option.searchTerms.some(term => 
          term.toLowerCase().includes(searchLower)
        )
      }
      
      return false
    }).sort((a, b) => {
      // Prioritize exact matches and shorter labels
      const aLabel = a.label.toLowerCase()
      const bLabel = b.label.toLowerCase()
      
      if (aLabel.startsWith(searchLower) && !bLabel.startsWith(searchLower)) return -1
      if (!aLabel.startsWith(searchLower) && bLabel.startsWith(searchLower)) return 1
      
      return aLabel.length - bLabel.length
    })
  }, [options, search, recentSelections, showRecentSelections])

  // When dropdown closes, clear search
  React.useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  // Display value logic: 
  // - Closed: show selected option label
  // - Open + no search: show selected option label  
  // - Open + searching: show search text
  const displayValue = React.useMemo(() => {
    if (!open) {
      // Dropdown closed: always show selected option
      return selectedOption?.label || ''
    }
    
    // Dropdown open: show search text only if user has typed something
    if (search.length > 0) {
      return search
    }
    
    // Dropdown open but no search: show selected option (allows editing)
    return selectedOption?.label || ''
  }, [open, search, selectedOption?.label])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
              // Only select text if no option is currently selected
              // This prevents wiping out the displayed selection
              if (!selectedOption?.label) {
                setTimeout(() => inputRef.current?.select(), 0)
              }
            }}
            onClick={() => {
              if (!open) {
                setOpen(true)
                // Only auto-select if there's no current selection
                if (!selectedOption?.label) {
                  setTimeout(() => inputRef.current?.select(), 0)
                }
              }
            }}
            onKeyDown={(e) => {
              // Enhanced keyboard navigation
              if (e.key === 'Escape') {
                setOpen(false)
                setSearch('')
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (!open) {
                  setOpen(true)
                } else if (filteredOptions.length === 1) {
                  // Auto-select if only one option
                  setSearch('')
                  onValueChange(filteredOptions[0].value)
                  setOpen(false)
                  setTimeout(() => inputRef.current?.blur(), 0)
                }
              } else if (e.key === 'ArrowDown' && !open) {
                e.preventDefault()
                setOpen(true)
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              open && 'ring-2 ring-ring ring-offset-2',
              className
            )}
            role="combobox"
            aria-expanded={open}
          />
          <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0" 
        align="start"
        onOpenAutoFocus={(e) => {
          // Prevent the popover from stealing focus from the input
          e.preventDefault()
        }}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-[300px] overflow-auto">
            <CommandEmpty>
              <div className="text-center py-3 text-sm text-muted-foreground">
                No results found.
                <div className="text-xs mt-1">Try searching by country code or language name</div>
              </div>
            </CommandEmpty>
            
            {/* Recent selections section */}
            {showRecentSelections && recentSelections.length > 0 && !search && (
              <CommandGroup heading="Recent">
                {recentSelections
                  .map(recent => options.find(opt => opt.value === recent))
                  .filter(Boolean)
                  .map((option) => (
                    <CommandItem
                      key={`recent-${option!.value}`}
                      value={option!.value}
                      onSelect={() => {
                        // Clear search first, then update value and close
                        setSearch('')
                        onValueChange(option!.value)
                        setOpen(false)
                        // Return focus to input after selection
                        setTimeout(() => inputRef.current?.focus(), 0)
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === option!.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex items-center gap-2">
                        {option!.label}
                        <span className="text-xs text-blue-600 dark:text-blue-400">recent</span>
                      </span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            
            {/* All options section */}
            <CommandGroup heading={search ? 'Search Results' : (showRecentSelections && recentSelections.length > 0) ? 'All Options' : undefined}>
              {filteredOptions
                .filter(option => !showRecentSelections || search || !recentSelections.includes(option.value))
                .map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      // Clear search first, then update value and close
                      setSearch('')
                      onValueChange(option.value)
                      setOpen(false)
                      // Return focus to input after selection
                      setTimeout(() => inputRef.current?.focus(), 0)
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
