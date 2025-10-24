import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { type TrendData } from "@/lib/analytics-utils"

export interface TrendIndicatorProps {
  trend: TrendData
  label?: string
  showPercentage?: boolean
  showDirection?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

export function TrendIndicator({
  trend,
  label,
  showPercentage = true,
  showDirection = true,
  className,
  size = "md",
}: TrendIndicatorProps) {
  const getIcon = () => {
    if (!showDirection) { return null; }
    
    switch (trend.direction) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-emerald-600" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getColorClass = () => {
    switch (trend.direction) {
      case "up":
        return "text-emerald-600"
      case "down":
        return "text-red-600"
      default:
        return "text-muted-foreground"
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-xs"
      case "lg":
        return "text-lg"
      default:
        return "text-sm"
    }
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {label && (
        <span className={cn("text-muted-foreground font-medium", getSizeClasses())}>
          {label}
        </span>
      )}
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {getIcon()}
          <span className={cn("font-bold", getColorClass(), getSizeClasses())}>
            {trend.current.toLocaleString()}
          </span>
        </div>
        {showPercentage && (
          <span className={cn(
            "rounded-full px-2 py-1 text-xs font-medium",
            trend.direction === "up" 
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : trend.direction === "down"
              ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          )}>
            {formatPercentage(trend.changePercent)}
          </span>
        )}
      </div>
    </div>
  )
}
