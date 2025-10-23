/**
 * Shared formatting utilities for consistent date and number formatting across the application.
 */

// Number formatters
export const numberFormatter = new Intl.NumberFormat("en-US")

export const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

// Date formatters
export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

export const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

export const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
})

// Timestamp utilities
export function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = timestamp - now
  const absolute = Math.abs(diff)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  if (absolute < minute) {
    return relativeTimeFormatter.format(0, "minute")
  }

  if (absolute < hour) {
    return relativeTimeFormatter.format(Math.round(diff / minute), "minute")
  }

  if (absolute < day) {
    return relativeTimeFormatter.format(Math.round(diff / hour), "hour")
  }

  if (absolute < week) {
    return relativeTimeFormatter.format(Math.round(diff / day), "day")
  }

  return relativeTimeFormatter.format(Math.round(diff / week), "week")
}
