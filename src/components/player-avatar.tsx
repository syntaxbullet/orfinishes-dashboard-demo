/**
 * Reusable player avatar components for consistent display across the application.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import type { PlayerDisplayInfo } from "@/lib/player-utils"

export interface PlayerAvatarProps {
  profile: PlayerDisplayInfo
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-xs", 
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-2xl",
}

export function PlayerAvatar({ profile, size = "md", className }: PlayerAvatarProps) {
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={`${profile.displayName} avatar`}
        className={cn(
          "rounded border border-border object-cover",
          sizeClasses[size],
          className,
        )}
        loading="lazy"
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded border border-dashed border-muted-foreground/40 bg-muted font-medium uppercase text-muted-foreground",
        sizeClasses[size],
        className,
      )}
    >
      {profile.fallbackInitial}
    </div>
  )
}

export interface PlayerAvatarFallbackProps {
  displayName: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function PlayerAvatarFallback({ 
  displayName, 
  size = "md", 
  className 
}: PlayerAvatarFallbackProps) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "?"

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded border border-dashed border-muted-foreground/40 bg-muted font-medium uppercase text-muted-foreground",
        sizeClasses[size],
        className,
      )}
    >
      {initial}
    </div>
  )
}
