/**
 * Reusable data table toolbar components for consistent filtering and search UI.
 * Extracts common toolbar patterns used across all data table implementations.
 */

import * as React from "react"
import type { Column } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface DataTableToolbarProps {
  /** Child components to render in the toolbar */
  children: React.ReactNode
  /** Whether there are active filters */
  hasFilters?: boolean
  /** Callback when reset button is clicked */
  onReset?: () => void
  /** Text for the reset button */
  resetText?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Main toolbar container for data tables.
 * Provides consistent layout and reset functionality.
 */
export function DataTableToolbar({
  children,
  hasFilters = false,
  onReset,
  resetText = "Reset filters",
  className,
}: DataTableToolbarProps) {
  return (
    <div className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${className || ""}`}>
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {children}
      </div>
      
      {hasFilters && onReset && (
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
          >
            {resetText}
          </Button>
        </div>
      )}
    </div>
  )
}

export interface DataTableSearchProps<TData> {
  /** The table column to filter */
  column?: Column<TData, unknown>
  /** Placeholder text for the search input */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Search input component for data table filtering.
 */
export function DataTableSearch<TData>({
  column,
  placeholder = "Search...",
  className,
}: DataTableSearchProps<TData>) {
  const searchValue = (column?.getFilterValue() as string | undefined) ?? ""

  return (
    <Input
      value={searchValue}
      onChange={(event) => column?.setFilterValue(event.target.value)}
      placeholder={placeholder}
      className={`w-full sm:max-w-xs ${className || ""}`}
    />
  )
}

export interface DataTableFilterOption {
  /** The value for the option */
  value: string
  /** The display label for the option */
  label: string
}

export interface DataTableFilterProps {
  /** Current filter value */
  value: string
  /** Callback when filter value changes */
  onChange: (value: string) => void
  /** Available filter options */
  options: DataTableFilterOption[]
  /** Label for the filter */
  label: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Filter dropdown component for data table filtering.
 */
export function DataTableFilter({
  value,
  onChange,
  options,
  label,
  className,
}: DataTableFilterProps) {
  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export interface DataTableRefreshProps {
  /** Whether a refresh is in progress */
  isRefreshing?: boolean
  /** Callback when refresh button is clicked */
  onRefresh?: () => void
  /** Text for the refresh button */
  refreshText?: string
  /** Text for the refreshing state */
  refreshingText?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Refresh button component for data tables.
 */
export function DataTableRefresh({
  isRefreshing = false,
  onRefresh,
  refreshText = "Refresh",
  refreshingText = "Refreshing",
  className,
}: DataTableRefreshProps) {
  if (!onRefresh) {
    return null
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={onRefresh}
      disabled={isRefreshing}
      className={className}
    >
      {isRefreshing ? (
        <>
          <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {refreshingText}
        </>
      ) : (
        refreshText
      )}
    </Button>
  )
}
