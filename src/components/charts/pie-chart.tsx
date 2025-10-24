import * as React from "react"
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"

export interface PieChartData {
  name: string
  value: number
  color?: string
}

export interface PieChartProps {
  data: PieChartData[]
  title?: string
  description?: string
  height?: number
  className?: string
  showLegend?: boolean
  showLabel?: boolean
  labelFormatter?: (value: number, name: string) => string
  colors?: string[]
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
]

export function PieChart({
  data,
  title,
  description,
  height = 300,
  className,
  showLegend = true,
  showLabel = false,
  labelFormatter,
  colors = DEFAULT_COLORS,
}: PieChartProps) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const formatTooltipLabel = (value: number, name: string) => {
    if (labelFormatter) {
      return labelFormatter(value, name)
    }
    return `${name}: ${value}`
  }

  const formatTooltipValue = (value: number) => {
    return value.toLocaleString()
  }

  const responsiveHeight = isMobile ? Math.min(height, 250) : height
  const responsiveOuterRadius = isMobile ? 60 : 80

  return (
    <div className={cn("space-y-2 sm:space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      
      <div style={{ height: responsiveHeight }} className="rounded-lg bg-muted/20 p-2 sm:p-4">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showLabel ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
              outerRadius={responsiveOuterRadius}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || colors[index % colors.length]} 
                />
              ))}
            </Pie>
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={formatTooltipLabel}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: isMobile ? "12px" : "14px",
              }}
              labelStyle={{
                color: "hsl(var(--foreground))",
                fontWeight: 500,
              }}
            />
            {showLegend && (
              <Legend 
                wrapperStyle={{
                  fontSize: isMobile ? "12px" : "14px",
                  paddingTop: isMobile ? "8px" : "16px"
                }}
                verticalAlign={isMobile ? "bottom" : "top"}
                height={isMobile ? 36 : 72}
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
