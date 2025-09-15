'use client'

import React, { useState, useEffect } from 'react'
import { Filter, X, ChevronDown, Calendar, Star, Gamepad2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { GameFilters } from '@/lib/types/game-types'

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface GameFiltersProps {
  className?: string
  filters: GameFilters
  onFiltersChange: (filters: GameFilters) => void
  onClearFilters?: () => void
  showAsPopover?: boolean
  showActiveCount?: boolean
  compact?: boolean
  disabled?: boolean
}

export interface FilterOption {
  value: string
  label: string
  count?: number
  icon?: React.ReactNode
}

export interface FilterSection {
  key: keyof GameFilters
  title: string
  icon: React.ReactNode
  type: 'select' | 'multiselect' | 'range' | 'year'
  options?: FilterOption[]
  min?: number
  max?: number
  step?: number
  defaultOpen?: boolean
}

// ============================================================================
// FILTER CONFIGURATION
// ============================================================================

const FILTER_SECTIONS: FilterSection[] = [
  {
    key: 'genres',
    title: 'Genres',
    icon: <Tag className="h-4 w-4" />,
    type: 'multiselect',
    defaultOpen: true,
    options: [
      { value: 'action', label: 'Action', count: 12543 },
      { value: 'adventure', label: 'Adventure', count: 8932 },
      { value: 'rpg', label: 'RPG', count: 7421 },
      { value: 'strategy', label: 'Strategy', count: 6234 },
      { value: 'shooter', label: 'Shooter', count: 5876 },
      { value: 'puzzle', label: 'Puzzle', count: 4567 },
      { value: 'racing', label: 'Racing', count: 3421 },
      { value: 'sports', label: 'Sports', count: 2987 },
      { value: 'simulation', label: 'Simulation', count: 2654 },
      { value: 'platformer', label: 'Platformer', count: 2341 },
      { value: 'fighting', label: 'Fighting', count: 1876 },
      { value: 'horror', label: 'Horror', count: 1543 },
      { value: 'survival', label: 'Survival', count: 1234 },
      { value: 'sandbox', label: 'Sandbox', count: 987 }
    ]
  },
  {
    key: 'platforms',
    title: 'Platforms',
    icon: <Gamepad2 className="h-4 w-4" />,
    type: 'multiselect',
    defaultOpen: true,
    options: [
      { value: 'pc', label: 'PC', count: 15432 },
      { value: 'playstation-5', label: 'PlayStation 5', count: 8765 },
      { value: 'playstation-4', label: 'PlayStation 4', count: 12345 },
      { value: 'xbox-series-x', label: 'Xbox Series X/S', count: 7654 },
      { value: 'xbox-one', label: 'Xbox One', count: 9876 },
      { value: 'nintendo-switch', label: 'Nintendo Switch', count: 6543 },
      { value: 'ios', label: 'iOS', count: 4321 },
      { value: 'android', label: 'Android', count: 3987 },
      { value: 'mac', label: 'Mac', count: 2654 },
      { value: 'linux', label: 'Linux', count: 1876 }
    ]
  },
  {
    key: 'year',
    title: 'Release Year',
    icon: <Calendar className="h-4 w-4" />,
    type: 'range',
    min: 1980,
    max: new Date().getFullYear(),
    step: 1,
    defaultOpen: false
  },
  {
    key: 'rating',
    title: 'Rating',
    icon: <Star className="h-4 w-4" />,
    type: 'range',
    min: 0,
    max: 5,
    step: 0.1,
    defaultOpen: false
  }
]

const SORT_OPTIONS: FilterOption[] = [
  { value: '-relevance', label: 'Most Relevant' },
  { value: '-rating', label: 'Highest Rated' },
  { value: '-released', label: 'Newest First' },
  { value: 'released', label: 'Oldest First' },
  { value: '-added', label: 'Recently Added' },
  { value: 'name', label: 'A-Z' },
  { value: '-name', label: 'Z-A' },
  { value: '-metacritic', label: 'Metacritic Score' },
  { value: '-playtime', label: 'Most Played' }
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get active filter count
 */
function getActiveFilterCount(filters: GameFilters): number {
  return Object.entries(filters).filter(([key, value]) => {
    if (!value) return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'string') return value.trim().length > 0
    return true
  }).length
}

/**
 * Get filter display value
 */
function getFilterDisplayValue(section: FilterSection, filters: GameFilters): string {
  const value = filters[section.key]
  
  if (!value) return 'Any'
  
  switch (section.type) {
    case 'select':
      const option = section.options?.find(opt => opt.value === value)
      return option?.label || String(value)
      
    case 'multiselect':
      if (Array.isArray(value)) {
        if (value.length === 0) return 'Any'
        if (value.length === 1) {
          const option = section.options?.find(opt => opt.value === value[0])
          return option?.label || value[0]
        }
        return `${value.length} selected`
      }
      return 'Any'
      
    case 'range':
      if (Array.isArray(value) && value.length === 2) {
        if (section.key === 'year') {
          return `${value[0]} - ${value[1]}`
        }
        if (section.key === 'rating') {
          return `${value[0]}+ stars`
        }
        return `${value[0]} - ${value[1]}`
      }
      return 'Any'
      
    default:
      return String(value)
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GameFilters({
  className,
  filters,
  onFiltersChange,
  onClearFilters,
  showAsPopover = false,
  showActiveCount = true,
  compact = false,
  disabled = false
}: GameFiltersProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    FILTER_SECTIONS.reduce((acc, section) => ({
      ...acc,
      [section.key]: section.defaultOpen || false
    }), {})
  )
  
  const [tempFilters, setTempFilters] = useState<GameFilters>(filters)
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const activeCount = getActiveFilterCount(filters)
  const hasActiveFilters = activeCount > 0
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleFilterChange = (key: keyof GameFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    onFiltersChange(newFilters)
  }
  
  const handleMultiselectChange = (key: keyof GameFilters, optionValue: string, checked: boolean) => {
    const currentValues = (filters[key] as string[]) || []
    const newValues = checked
      ? [...currentValues, optionValue]
      : currentValues.filter(v => v !== optionValue)
    
    handleFilterChange(key, newValues.length > 0 ? newValues : undefined)
  }
  
  const handleRangeChange = (key: keyof GameFilters, values: number[]) => {
    const section = FILTER_SECTIONS.find(s => s.key === key)
    if (!section) return
    
    // Only apply filter if values differ from default range
    if (values[0] === section.min && values[1] === section.max) {
      handleFilterChange(key, undefined)
    } else {
      handleFilterChange(key, values)
    }
  }
  
  const handleClearAllFilters = () => {
    const clearedFilters: GameFilters = {}
    onFiltersChange(clearedFilters)
    onClearFilters?.()
  }
  
  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderFilterSection = (section: FilterSection) => {
    const isOpen = openSections[section.key]
    const displayValue = getFilterDisplayValue(section, filters)
    const hasValue = displayValue !== 'Any'
    
    return (
      <Collapsible
        key={section.key}
        open={isOpen}
        onOpenChange={() => toggleSection(section.key)}
        className="border-b border-border last:border-b-0"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-between p-4 h-auto font-normal hover:bg-muted/50',
              hasValue && 'bg-muted/30'
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-3">
              {section.icon}
              <span className="font-medium">{section.title}</span>
              {hasValue && !compact && (
                <Badge variant="secondary" className="ml-2">
                  {displayValue}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 pb-4">
          {renderFilterContent(section)}
        </CollapsibleContent>
      </Collapsible>
    )
  }
  
  const renderFilterContent = (section: FilterSection) => {
    const currentValue = filters[section.key]
    
    switch (section.type) {
      case 'select':
        return (
          <div className="space-y-2">
            {section.options?.map((option) => (
              <Button
                key={option.value}
                variant={currentValue === option.value ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => handleFilterChange(section.key, 
                  currentValue === option.value ? undefined : option.value
                )}
                disabled={disabled}
              >
                <span>{option.label}</span>
                {option.count && (
                  <Badge variant="outline" className="text-xs">
                    {option.count.toLocaleString()}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )
        
      case 'multiselect':
        const selectedValues = (currentValue as string[]) || []
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedValues.length} selected
              </span>
              {selectedValues.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange(section.key, undefined)}
                  className="h-6 px-2 text-xs"
                  disabled={disabled}
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="max-h-48 overflow-y-auto space-y-2">
              {section.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${section.key}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleMultiselectChange(section.key, option.value, !!checked)
                    }
                    disabled={disabled}
                  />
                  <label
                    htmlFor={`${section.key}-${option.value}`}
                    className="flex-1 flex items-center justify-between text-sm cursor-pointer"
                  >
                    <span>{option.label}</span>
                    {option.count && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {option.count.toLocaleString()}
                      </Badge>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )
        
      case 'range':
        const rangeValue = (currentValue as number[]) || [section.min!, section.max!]
        const isDefault = rangeValue[0] === section.min && rangeValue[1] === section.max
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {section.key === 'year' ? 'Year Range' : 'Rating Range'}
              </span>
              {!isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange(section.key, undefined)}
                  className="h-6 px-2 text-xs"
                  disabled={disabled}
                >
                  Reset
                </Button>
              )}
            </div>
            
            <div className="px-2">
              <Slider
                min={section.min}
                max={section.max}
                step={section.step}
                value={rangeValue}
                onValueChange={(values) => handleRangeChange(section.key, values)}
                className="w-full"
                disabled={disabled}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{rangeValue[0]}</span>
              <span>{rangeValue[1]}</span>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }
  
  const renderSortSection = () => (
    <div className="p-4 border-b border-border">
      <div className="flex items-center gap-3 mb-3">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Sort By</span>
      </div>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            {SORT_OPTIONS.find(opt => opt.value === filters.ordering)?.label || 'Most Relevant'}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandList>
              <CommandGroup>
                {SORT_OPTIONS.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleFilterChange('ordering', option.value)}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
  
  const renderFiltersContent = () => (
    <div className={cn('w-full', compact ? 'max-w-sm' : 'max-w-md')}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-semibold">Filters</span>
          {showActiveCount && hasActiveFilters && (
            <Badge variant="secondary">
              {activeCount}
            </Badge>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllFilters}
            className="h-8 px-3 text-sm"
            disabled={disabled}
          >
            Clear All
          </Button>
        )}
      </div>
      
      {/* Sort Section */}
      {renderSortSection()}
      
      {/* Filter Sections */}
      <div className="max-h-96 overflow-y-auto">
        {FILTER_SECTIONS.map(renderFilterSection)}
      </div>
    </div>
  )
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  if (showAsPopover) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'gap-2',
              hasActiveFilters && 'bg-primary text-primary-foreground hover:bg-primary/90',
              className
            )}
            disabled={disabled}
          >
            <Filter className="h-4 w-4" />
            Filters
            {showActiveCount && hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {renderFiltersContent()}
        </PopoverContent>
      </Popover>
    )
  }
  
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-0">
        {renderFiltersContent()}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ACTIVE FILTERS DISPLAY COMPONENT
// ============================================================================

export interface ActiveFiltersProps {
  filters: GameFilters
  onRemoveFilter: (key: keyof GameFilters, value?: string) => void
  onClearAll?: () => void
  className?: string
}

export function ActiveFilters({
  filters,
  onRemoveFilter,
  onClearAll,
  className
}: ActiveFiltersProps) {
  const activeFilters = Object.entries(filters).filter(([, value]) => {
    if (!value) return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'string') return value.trim().length > 0
    return true
  })
  
  if (activeFilters.length === 0) return null
  
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">Active filters:</span>
      
      {activeFilters.map(([key, value]) => {
        const section = FILTER_SECTIONS.find(s => s.key === key)
        if (!section) return null
        
        if (Array.isArray(value)) {
          return value.map((item) => (
            <Badge
              key={`${key}-${item}`}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-xs">{section.title}:</span>
              <span>{section.options?.find(opt => opt.value === item)?.label || item}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-muted"
                onClick={() => onRemoveFilter(key as keyof GameFilters, item)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))
        }
        
        return (
          <Badge
            key={key}
            variant="secondary"
            className="gap-1 pr-1"
          >
            <span className="text-xs">{section.title}:</span>
            <span>{getFilterDisplayValue(section, filters)}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-muted"
              onClick={() => onRemoveFilter(key as keyof GameFilters)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )
      })}
      
      {activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  )
}
