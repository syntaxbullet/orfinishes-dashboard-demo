/**
 * Reusable stat card component for displaying metrics with consistent styling.
 * Handles loading states automatically and provides consistent layout.
 */

import * as React from "react"
import type { LucideIcon } from "lucide-react"

export interface StatCardProps {
  /** The label/title for the stat */
  label: string
  /** The main value to display */
  value: string
  /** Additional detail text shown below the value */
  detail: string
  /** Optional icon to display */
  icon?: LucideIcon
  /** Whether the card is in a loading state */
  isLoading?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * StatCard component for displaying metrics with consistent styling.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function StatCard({
  label,
  value,
  detail,
  isLoading = false,
  className,
}: StatCardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 shadow-sm ${className || ""}`}>
      <p className="text-sm font-medium text-muted-foreground">
        {label}
      </p>
      
      {isLoading ? (
        <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mt-2 text-2xl font-semibold text-foreground">
          {value}
        </p>
      )}
      
      <p className="mt-1 text-xs text-muted-foreground">
        {isLoading ? (
          <span className="inline-block h-3 w-32 animate-pulse rounded bg-muted" />
        ) : (
          detail
        )}
      </p>
    </div>
  )
}

/**
 * StatCard with icon variant for dashboard metrics.
 */
export interface StatCardWithIconProps extends Omit<StatCardProps, 'icon'> {
  /** Icon component to display */
  icon: LucideIcon
}

export function StatCardWithIcon({
  label,
  value,
  detail,
  icon: Icon,
  isLoading = false,
  className,
}: StatCardWithIconProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm ${className || ""}`}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {isLoading ? (
            <div className="mt-1 h-8 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {value}
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {isLoading ? (
          <span className="inline-block h-3 w-32 animate-pulse rounded bg-muted" />
        ) : (
          detail
        )}
      </p>
    </div>
  )
}
