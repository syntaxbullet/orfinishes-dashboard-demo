import type { ItemRecord, CosmeticRecord, PlayerRecord } from "@/utils/supabase"

/**
 * Extract unique finish types from items, sorted by frequency of use
 */
export function getUniqueFinishTypes(items: ItemRecord[]): string[] {
  const finishTypeCounts = new Map<string, number>()
  
  for (const item of items) {
    const finishType = item.finish_type?.trim()
    if (finishType) {
      finishTypeCounts.set(finishType, (finishTypeCounts.get(finishType) || 0) + 1)
    }
  }
  
  return Array.from(finishTypeCounts.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency (most common first)
    .map(([finishType]) => finishType)
}

/**
 * Format item for display in search results
 */
export function formatItemForDisplay(
  item: ItemRecord, 
  cosmetic: CosmeticRecord | null, 
  owner: PlayerRecord | null
): string {
  const cosmeticName = cosmetic?.name || "Unknown Cosmetic"
  const finishType = item.finish_type || "Unknown"
  const ownerName = owner?.display_name || "Unassigned"
  
  return `${cosmeticName} - ${finishType} (owned by ${ownerName})`
}

/**
 * Validate event data before submission
 */
export function validateEventData(data: {
  action: string
  itemId?: string
  cosmeticId?: string
  finishType?: string
  fromPlayer?: string
  toPlayer?: string
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.action) {
    errors.push("Action is required")
  }
  
  if (data.action === "transfer" || data.action === "revoke") {
    if (!data.itemId) {
      errors.push("Item selection is required for transfer/revoke actions")
    }
    if (data.action === "transfer" && !data.toPlayer) {
      errors.push("Recipient player is required for transfer")
    }
  }
  
  if (data.action === "unbox" || data.action === "grant") {
    if (!data.cosmeticId) {
      errors.push("Cosmetic selection is required for unbox/grant actions")
    }
    if (!data.finishType) {
      errors.push("Finish type is required for unbox/grant actions")
    }
    if (!data.toPlayer) {
      errors.push("Recipient player is required for unbox/grant actions")
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get action display labels
 */
export const ACTION_LABELS = {
  unbox: "Unbox",
  grant: "Grant", 
  transfer: "Transfer",
  revoke: "Revoke"
} as const

/**
 * Get action descriptions
 */
export const ACTION_DESCRIPTIONS = {
  unbox: "Create a new item by unboxing a cosmetic",
  grant: "Create a new item by granting a cosmetic", 
  transfer: "Transfer an existing item between players",
  revoke: "Revoke an item from a player"
} as const
