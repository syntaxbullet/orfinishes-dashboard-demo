import * as React from "react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"

export interface BarChartData {
  [key: string]: string | number
}

export interface BarChartProps {
  data: BarChartData[]
  bars: Array<{
    dataKey: string
    name: string
    color: string
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

export function BarChart({
  data,
  bars,
  title,
  description,
  height = 300,
  className,
  showLegend = true,
  showGrid = true,
  xAxisKey = "name",
  yAxisLabel,
  xAxisLabel,
  stacked = false,
}: BarChartProps) {
  const formatTooltipLabel = (label: string) => {
    return String(label)
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
          <RechartsBarChart
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
            {bars.map((bar) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color}
                stackId={stacked ? "stack" : undefined}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
