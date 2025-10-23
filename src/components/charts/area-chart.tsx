import * as React from "react"
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"

export interface AreaChartData {
  date: string
  [key: string]: string | number
}

export interface AreaChartProps {
  data: AreaChartData[]
  areas: Array<{
    dataKey: string
    name: string
    color: string
    fillOpacity?: number
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
  stacked?: boolean
}

export function AreaChart({
  data,
  areas,
  title,
  description,
  height = 300,
  className,
  showLegend = true,
  showGrid = true,
  xAxisKey = "date",
  yAxisLabel,
  xAxisLabel,
  stacked = false,
}: AreaChartProps) {
  const formatXAxisLabel = (value: string) => {
    const date = new Date(value)
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

  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      
      <div style={{ height }} className="rounded-lg bg-muted/20 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
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
              }}
              labelStyle={{
                color: "hsl(var(--foreground))",
                fontWeight: 500,
              }}
            />
            {showLegend && <Legend />}
            {areas.map((area) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name}
                stroke={area.color}
                fill={area.color}
                fillOpacity={area.fillOpacity || 0.1}
                stackId={stacked ? "stack" : undefined}
                strokeWidth={2}
              />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
