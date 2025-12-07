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
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase()) ||
      option.value.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  // When dropdown closes, clear search
  React.useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  // Display value: show search when dropdown is open, otherwise show selected
  const displayValue = open ? search : (selectedOption?.label || '')

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
              // Select all text on focus for easy replacement
              setTimeout(() => inputRef.current?.select(), 0)
            }}
            onClick={() => {
              if (!open) {
                setOpen(true)
                setTimeout(() => inputRef.current?.select(), 0)
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value)
                    setSearch('')
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
