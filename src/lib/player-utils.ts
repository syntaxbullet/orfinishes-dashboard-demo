/**
 * Player-related utilities for UUID normalization, avatar URL building, and display name extraction.
 */

import type { PlayerRecord } from "@/utils/supabase"

/**
 * Normalizes a Minecraft UUID by removing non-hex characters and converting to lowercase.
 * Returns null if the resulting string is not exactly 32 characters.
 */
export function normalizeMinecraftUuid(uuid: string | null): string | null {
  if (!uuid) {
    return null
  }

  const normalized = uuid.replace(/[^a-fA-F0-9]/g, "").toLowerCase()
  return normalized.length === 32 ? normalized : null
}

/**
 * Builds a player avatar URL with optional size parameter.
 * Returns null if the player's UUID cannot be normalized.
 */
export function buildPlayerAvatarUrl(player: PlayerRecord, size: number = 64): string | null {
  const normalizedUuid = normalizeMinecraftUuid(player.minecraft_uuid)
  if (!normalizedUuid) {
    return null
  }

  const revisionSource =
    player.avatar_synced_at ??
    player.profile_synced_at ??
    player.updated_at ??
    player.created_at

  let revisionParam: string | null = null

  if (revisionSource) {
    const timestamp = Date.parse(revisionSource)
    if (!Number.isNaN(timestamp)) {
      revisionParam = String(timestamp)
    }
  }

  const searchParams = new URLSearchParams({
    size: String(size),
  })

  if (revisionParam) {
    searchParams.set("rev", revisionParam)
  }

  return `/api/minecraft-profile/${normalizedUuid}/avatar?${searchParams.toString()}`
}

/**
 * Extracts a display name from a player record, with fallback to UUID.
 */
export function getPlayerDisplayName(player: PlayerRecord): string {
  return player.display_name?.trim() || "Unknown player"
}

/**
 * Gets the first character of a player's display name for fallback avatars.
 */
export function getPlayerInitial(player: PlayerRecord): string {
  const displayName = getPlayerDisplayName(player)
  return displayName.trim().charAt(0).toUpperCase() || "?"
}

/**
 * Type for consistent player display information across components.
 */
export type PlayerDisplayInfo = {
  id: string
  displayName: string
  avatarUrl: string | null
  fallbackInitial: string
  minecraftUuid: string
}

/**
 * Creates a PlayerDisplayInfo object from a PlayerRecord.
 */
export function createPlayerDisplayInfo(player: PlayerRecord, avatarSize: number = 64): PlayerDisplayInfo {
  const displayName = getPlayerDisplayName(player)
  
  return {
    id: player.id,
    displayName,
    avatarUrl: buildPlayerAvatarUrl(player, avatarSize),
    fallbackInitial: getPlayerInitial(player),
    minecraftUuid: player.minecraft_uuid,
  }
}
