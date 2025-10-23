import { timeWindows, isWithinTimeWindow, parseTimestamp } from "./time-utils"
import { type OwnershipEventRecord, type PlayerRecord, type ItemOwnershipSnapshot } from "@/utils/supabase"

export interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  direction: "up" | "down" | "stable"
}

export interface TimeSeriesDataPoint {
  date: string
  [key: string]: string | number
}

export interface ActivityMetrics {
  totalEvents: number
  unboxedEvents: number
  transferEvents: number
  revokeEvents: number
  uniquePlayers: number
  uniqueItems: number
}

export function calculateTrend(current: number, previous: number): TrendData {
  const change = current - previous
  const changePercent = previous === 0 ? (current > 0 ? 100 : 0) : (change / previous) * 100
  
  let direction: "up" | "down" | "stable" = "stable"
  if (Math.abs(changePercent) > 5) { // Only consider significant changes
    direction = changePercent > 0 ? "up" : "down"
  }
  
  return {
    current,
    previous,
    change,
    changePercent,
    direction,
  }
}

export function generateTimeSeriesData(
  events: OwnershipEventRecord[],
  timeWindow: { start: number; end: number },
  groupBy: "day" | "week" | "month" = "day"
): TimeSeriesDataPoint[] {
  const dataMap = new Map<string, ActivityMetrics>()
  
  // Initialize all time periods in the range
  const startDate = new Date(timeWindow.start)
  const endDate = new Date(timeWindow.end)
  
  const periods: string[] = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    let periodKey: string
    if (groupBy === "day") {
      periodKey = current.toISOString().split("T")[0]
      current.setDate(current.getDate() + 1)
    } else if (groupBy === "week") {
      const weekStart = new Date(current)
      weekStart.setDate(current.getDate() - current.getDay())
      periodKey = weekStart.toISOString().split("T")[0]
      current.setDate(current.getDate() + 7)
    } else { // month
      periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
      current.setMonth(current.getMonth() + 1)
    }
    periods.push(periodKey)
  }
  
  // Initialize all periods with zero values
  periods.forEach(period => {
    dataMap.set(period, {
      totalEvents: 0,
      unboxedEvents: 0,
      transferEvents: 0,
      revokeEvents: 0,
      uniquePlayers: 0,
      uniqueItems: 0,
    })
  })
  
  // Process events
  const playerSet = new Set<string>()
  const itemSet = new Set<string>()
  
  for (const event of events) {
    const timestamp = parseTimestamp(event.occurred_at)
    if (timestamp === null || !isWithinTimeWindow(timestamp, timeWindow)) {
      continue
    }
    
    let periodKey: string
    const eventDate = new Date(timestamp)
    
    if (groupBy === "day") {
      periodKey = eventDate.toISOString().split("T")[0]
    } else if (groupBy === "week") {
      const weekStart = new Date(eventDate)
      weekStart.setDate(eventDate.getDate() - eventDate.getDay())
      periodKey = weekStart.toISOString().split("T")[0]
    } else { // month
      periodKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`
    }
    
    const metrics = dataMap.get(periodKey)
    if (metrics) {
      metrics.totalEvents++
      
      if (event.action === "grant" || event.action === "unbox") {
        metrics.unboxedEvents++
      } else if (event.action === "transfer") {
        metrics.transferEvents++
      } else if (event.action === "revoke") {
        metrics.revokeEvents++
      }
      
      if (event.to_player) {
        playerSet.add(event.to_player)
        metrics.uniquePlayers = playerSet.size
      }
      
      itemSet.add(event.item_id)
      metrics.uniqueItems = itemSet.size
    }
  }
  
  // Convert to array format
  return periods.map(period => {
    const metrics = dataMap.get(period) || {
      totalEvents: 0,
      unboxedEvents: 0,
      transferEvents: 0,
      revokeEvents: 0,
      uniquePlayers: 0,
      uniqueItems: 0,
    }
    
    return {
      date: period,
      total: metrics.totalEvents,
      unboxed: metrics.unboxedEvents,
      transfers: metrics.transferEvents,
      revokes: metrics.revokeEvents,
      players: metrics.uniquePlayers,
      items: metrics.uniqueItems,
    }
  })
}

export function generatePlayerGrowthData(
  players: PlayerRecord[],
  timeWindow: { start: number; end: number },
  groupBy: "day" | "week" | "month" = "day"
): TimeSeriesDataPoint[] {
  const dataMap = new Map<string, { newPlayers: number; totalPlayers: number }>()
  
  // Initialize all time periods
  const startDate = new Date(timeWindow.start)
  const endDate = new Date(timeWindow.end)
  
  const periods: string[] = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    let periodKey: string
    if (groupBy === "day") {
      periodKey = current.toISOString().split("T")[0]
      current.setDate(current.getDate() + 1)
    } else if (groupBy === "week") {
      const weekStart = new Date(current)
      weekStart.setDate(current.getDate() - current.getDay())
      periodKey = weekStart.toISOString().split("T")[0]
      current.setDate(current.getDate() + 7)
    } else { // month
      periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
      current.setMonth(current.getMonth() + 1)
    }
    periods.push(periodKey)
  }
  
  // Initialize all periods
  periods.forEach(period => {
    dataMap.set(period, { newPlayers: 0, totalPlayers: 0 })
  })
  
  // Process players
  let cumulativePlayers = 0
  for (const player of players) {
    const createdAt = parseTimestamp(player.created_at)
    if (createdAt === null || !isWithinTimeWindow(createdAt, timeWindow)) {
      continue
    }
    
    let periodKey: string
    const playerDate = new Date(createdAt)
    
    if (groupBy === "day") {
      periodKey = playerDate.toISOString().split("T")[0]
    } else if (groupBy === "week") {
      const weekStart = new Date(playerDate)
      weekStart.setDate(playerDate.getDate() - playerDate.getDay())
      periodKey = weekStart.toISOString().split("T")[0]
    } else { // month
      periodKey = `${playerDate.getFullYear()}-${String(playerDate.getMonth() + 1).padStart(2, "0")}`
    }
    
    const data = dataMap.get(periodKey)
    if (data) {
      data.newPlayers++
      cumulativePlayers++
      data.totalPlayers = cumulativePlayers
    }
  }
  
  // Convert to array format
  return periods.map(period => {
    const data = dataMap.get(period) || { newPlayers: 0, totalPlayers: 0 }
    return {
      date: period,
      new: data.newPlayers,
      total: data.totalPlayers,
    }
  })
}

export function generateFinishTypeDistribution(
  snapshots: ItemOwnershipSnapshot[]
): Array<{ name: string; value: number; color?: string }> {
  const typeCounts = new Map<string, number>()
  
  for (const snapshot of snapshots) {
    const finishType = snapshot.finish_type?.trim() || "Unknown"
    typeCounts.set(finishType, (typeCounts.get(finishType) || 0) + 1)
  }
  
  const colors = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#06b6d4", // cyan-500
    "#84cc16", // lime-500
    "#f97316", // orange-500
  ]
  
  return Array.from(typeCounts.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value)
}

export function generateActivityHeatmapData(
  events: OwnershipEventRecord[],
  timeWindow: { start: number; end: number }
): Array<{ hour: number; day: string; value: number }> {
  const dataMap = new Map<string, number>()
  
  for (const event of events) {
    const timestamp = parseTimestamp(event.occurred_at)
    if (timestamp === null || !isWithinTimeWindow(timestamp, timeWindow)) {
      continue
    }
    
    const date = new Date(timestamp)
    const day = date.toLocaleDateString("en-US", { weekday: "short" })
    const hour = date.getHours()
    
    const key = `${day}-${hour}`
    dataMap.set(key, (dataMap.get(key) || 0) + 1)
  }
  
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const result: Array<{ hour: number; day: string; value: number }> = []
  
  for (let hour = 0; hour < 24; hour++) {
    for (const day of days) {
      const key = `${day}-${hour}`
      result.push({
        hour,
        day,
        value: dataMap.get(key) || 0,
      })
    }
  }
  
  return result
}
