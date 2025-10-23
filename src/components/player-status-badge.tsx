/**
 * Reusable player status badge component for consistent display across the application.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface PlayerStatusBadgeProps {
  isBanned: boolean
  className?: string
}

export function PlayerStatusBadge({ isBanned, className }: PlayerStatusBadgeProps) {
  const statusBadgeClass = React.useMemo(() => {
    if (isBanned) {
      return "border-destructive/40 bg-destructive/10 text-destructive"
    }

    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
  }, [isBanned])

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        statusBadgeClass,
        className,
      )}
    >
      {isBanned ? "Banned" : "Active"}
    </span>
  )
}
