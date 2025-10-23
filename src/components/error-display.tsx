/**
 * Standardized error display component for consistent error UI across pages.
 * Provides reusable error message display with retry functionality.
 */

import * as React from "react"
import { Button } from "@/components/ui/button"

export interface ErrorDisplayProps {
  /** The error message to display */
  error: string
  /** Optional title for the error */
  title?: string
  /** Callback when retry button is clicked */
  onRetry?: () => void
  /** Text for the retry button */
  retryText?: string
  /** Additional CSS classes */
  className?: string
  /** Whether to show the retry button */
  showRetry?: boolean
}

/**
 * ErrorDisplay component for showing error messages with consistent styling.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export function ErrorDisplay({
  error,
  title,
  onRetry,
  retryText = "Try again",
  className,
  showRetry = true,
}: ErrorDisplayProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-center ${className || ""}`}>
      {title && (
        <p className="text-sm font-medium text-destructive">
          {title}
        </p>
      )}
      <p className="text-xs text-destructive">{error}</p>
      {showRetry && onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
        >
          {retryText}
        </Button>
      )}
    </div>
  )
}

/**
 * Inline error display for smaller error messages.
 */
export interface InlineErrorDisplayProps {
  /** The error message to display */
  error: string
  /** Callback when retry button is clicked */
  onRetry?: () => void
  /** Text for the retry button */
  retryText?: string
  /** Additional CSS classes */
  className?: string
}

export function InlineErrorDisplay({
  error,
  onRetry,
  retryText = "Retry",
  className,
}: InlineErrorDisplayProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive ${className || ""}`}>
      <span>{error}</span>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
        >
          {retryText}
        </Button>
      )}
    </div>
  )
}
