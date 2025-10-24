import * as React from "react"
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"

export interface LineChartData {
  date: string
  [key: string]: string | number
}

export interface LineChartProps {
  data: LineChartData[]
  lines: Array<{
    dataKey: string
    name: string
    color: string
    strokeWidth?: number
  }>
  title?: string
  description?: string
  height?: number
  className?: string
  showLegend?: boolean
  showGrid?: boolean
  xAxisKey?: string
  yAxisLabel?: string
  xAxisLabel?: string
}

export function LineChart({
  data,
  lines,
  title,
  description,
  height = 300,
  className,
  showLegend = true,
  showGrid = true,
  xAxisKey = "date",
  yAxisLabel,
  xAxisLabel,
}: LineChartProps) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
    if (isMobile) {
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      })
    }
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    })
  }

  const formatTooltipLabel = (label: string) => {
    const date = new Date(label)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const responsiveHeight = isMobile ? Math.min(height, 250) : height
  const responsiveMargins = isMobile 
    ? { top: 10, right: 10, left: 10, bottom: 10 }
    : { top: 20, right: 30, left: 20, bottom: 20 }

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
          <RechartsLineChart
            data={data}
            margin={responsiveMargins}
          >
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-muted-foreground/20" 
              />
            )}
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={formatXAxisLabel}
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              label={xAxisLabel ? {
                value: xAxisLabel,
                position: "insideBottom",
                offset: -10,
                className: "text-xs fill-muted-foreground"
              } : undefined}
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              label={yAxisLabel ? {
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                className: "text-xs fill-muted-foreground"
              } : undefined}
            />
            <Tooltip
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
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 2}
                dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
