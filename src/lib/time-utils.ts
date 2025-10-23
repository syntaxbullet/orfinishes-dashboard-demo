/**
 * Time utility functions for consistent time window calculations across the application.
 * Consolidates time-related logic that was scattered across page components.
 */

/**
 * Predefined time windows for common analytics periods.
 */
export const timeWindows = {
  /** Get timestamp for 7 days ago */
  last7Days: (): number => Date.now() - 7 * 24 * 60 * 60 * 1000,
  
  /** Get timestamp for 14 days ago */
  last14Days: (): number => Date.now() - 14 * 24 * 60 * 60 * 1000,
  
  /** Get timestamp for 30 days ago */
  last30Days: (): number => Date.now() - 30 * 24 * 60 * 60 * 1000,
  
  /** Get timestamp for 1 hour ago */
  lastHour: (): number => Date.now() - 60 * 60 * 1000,
  
  /** Get timestamp for 1 day ago */
  lastDay: (): number => Date.now() - 24 * 60 * 60 * 1000,
}

/**
 * Checks if a timestamp falls within a specific time window.
 * 
 * @param timestamp - The timestamp to check (in milliseconds)
 * @param windowStart - The start of the time window (in milliseconds)
 * @returns True if the timestamp is within the window
 */
export function isWithinTimeWindow(timestamp: number, windowStart: number): boolean {
  return timestamp >= windowStart
}

/**
 * Checks if a timestamp is within the last N days.
 * 
 * @param timestamp - The timestamp to check (in milliseconds)
 * @param days - Number of days to look back
 * @returns True if the timestamp is within the last N days
 */
export function isWithinLastDays(timestamp: number, days: number): boolean {
  const windowStart = Date.now() - days * 24 * 60 * 60 * 1000
  return isWithinTimeWindow(timestamp, windowStart)
}

/**
 * Gets the time window boundaries for analytics calculations.
 * 
 * @param days - Number of days for the window
 * @returns Object with start and end timestamps
 */
export function getTimeWindow(days: number): { start: number; end: number } {
  const now = Date.now()
  const start = now - days * 24 * 60 * 60 * 1000
  return { start, end: now }
}

/**
 * Gets the time window boundaries for comparing two periods.
 * 
 * @param days - Number of days for each period
 * @returns Object with current and previous period boundaries
 */
export function getComparisonWindows(days: number): {
  current: { start: number; end: number }
  previous: { start: number; end: number }
} {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const periodMs = days * dayMs

  return {
    current: {
      start: now - periodMs,
      end: now,
    },
    previous: {
      start: now - (periodMs * 2),
      end: now - periodMs,
    },
  }
}

/**
 * Validates and parses a timestamp string.
 * 
 * @param value - The timestamp string to parse
 * @returns Parsed timestamp in milliseconds, or null if invalid
 */
export function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

/**
 * Checks if a timestamp is valid (not NaN and not negative).
 * 
 * @param timestamp - The timestamp to validate
 * @returns True if the timestamp is valid
 */
export function isValidTimestamp(timestamp: number): boolean {
  return !Number.isNaN(timestamp) && timestamp >= 0
}

/**
 * Gets the most recent timestamp from an array of timestamp strings.
 * 
 * @param timestamps - Array of timestamp strings
 * @returns The most recent valid timestamp, or null if none found
 */
export function getMostRecentTimestamp(timestamps: (string | null | undefined)[]): number | null {
  let mostRecent: number | null = null

  for (const timestampStr of timestamps) {
    const timestamp = parseTimestamp(timestampStr)
    if (timestamp !== null && (mostRecent === null || timestamp > mostRecent)) {
      mostRecent = timestamp
    }
  }

  return mostRecent
}

/**
 * Calculates the time difference between two timestamps in various units.
 * 
 * @param from - Start timestamp
 * @param to - End timestamp (defaults to now)
 * @returns Object with time differences in various units
 */
export function getTimeDifference(from: number, to: number = Date.now()): {
  milliseconds: number
  seconds: number
  minutes: number
  hours: number
  days: number
} {
  const diff = to - from
  const second = 1000
  const minute = 60 * second
  const hour = 60 * minute
  const day = 24 * hour

  return {
    milliseconds: diff,
    seconds: Math.floor(diff / second),
    minutes: Math.floor(diff / minute),
    hours: Math.floor(diff / hour),
    days: Math.floor(diff / day),
  }
}
