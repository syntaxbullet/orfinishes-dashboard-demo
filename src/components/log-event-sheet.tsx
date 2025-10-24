import * as React from "react"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PlayerCombobox } from "@/components/log-event-form/player-combobox"
import { CosmeticCombobox } from "@/components/log-event-form/cosmetic-combobox"
import { FinishTypeCombobox } from "@/components/log-event-form/finish-type-combobox"
import { ItemSearchCombobox } from "@/components/log-event-form/item-search-combobox"
import { ACTION_LABELS, ACTION_DESCRIPTIONS, validateEventData } from "@/lib/event-utils"
import { createOwnershipEvent, type OwnershipAction } from "@/utils/supabase"

interface LogEventSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FormData = {
  action: OwnershipAction | ""
  itemId: string
  cosmeticId: string
  finishType: string
  fromPlayer: string
  toPlayer: string
  occurredAt: string
}

export function LogEventSheet({ open, onOpenChange }: LogEventSheetProps) {
  const [formData, setFormData] = React.useState<FormData>({
    action: "",
    itemId: "",
    cosmeticId: "",
    finishType: "",
    fromPlayer: "",
    toPlayer: "",
    occurredAt: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])

  // Reset form when sheet opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        action: "",
        itemId: "",
        cosmeticId: "",
        finishType: "",
        fromPlayer: "",
        toPlayer: "",
        occurredAt: new Date().toISOString().slice(0, 16),
      })
      setErrors([])
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    // Validate form data
    const validation = validateEventData({
      action: formData.action,
      itemId: formData.itemId || undefined,
      cosmeticId: formData.cosmeticId || undefined,
      finishType: formData.finishType || undefined,
      fromPlayer: formData.fromPlayer || undefined,
      toPlayer: formData.toPlayer || undefined,
    })

    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)

    try {
      const eventData = {
        item_id: formData.itemId,
        action: formData.action as OwnershipAction,
        from_player: formData.fromPlayer || null,
        to_player: formData.toPlayer || null,
        occurred_at: formData.occurredAt,
      }

      await createOwnershipEvent(eventData)
      
      // Close sheet and reset form on success
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create ownership event:", error)
      setErrors(["Failed to create event. Please try again."])
    } finally {
      setIsSubmitting(false)
    }
  }

  const isUnboxOrGrant = formData.action === "unbox" || formData.action === "grant"
  const isTransfer = formData.action === "transfer"
  const isRevoke = formData.action === "revoke"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Log Event
          </SheetTitle>
          <SheetDescription>
            Create a new ownership event or transfer an existing item.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Action Type */}
          <div className="space-y-2">
            <Label htmlFor="action">Action Type</Label>
            <Select
              value={formData.action}
              onValueChange={(value) => setFormData(prev => ({ ...prev, action: value as OwnershipAction }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action type..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {ACTION_DESCRIPTIONS[key as keyof typeof ACTION_DESCRIPTIONS]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Selection (for transfer/revoke) */}
          {(isTransfer || isRevoke) && (
            <div className="space-y-2">
              <Label htmlFor="item">Item</Label>
              <ItemSearchCombobox
                value={formData.itemId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, itemId: value }))}
                placeholder="Search for an item..."
              />
            </div>
          )}

          {/* Cosmetic Selection (for unbox/grant) */}
          {isUnboxOrGrant && (
            <div className="space-y-2">
              <Label htmlFor="cosmetic">Cosmetic</Label>
              <CosmeticCombobox
                value={formData.cosmeticId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cosmeticId: value }))}
                placeholder="Select a cosmetic..."
              />
            </div>
          )}

          {/* Finish Type (for unbox/grant) */}
          {isUnboxOrGrant && (
            <div className="space-y-2">
              <Label htmlFor="finishType">Finish Type</Label>
              <FinishTypeCombobox
                value={formData.finishType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, finishType: value }))}
                placeholder="Select finish type..."
              />
            </div>
          )}

          {/* From Player (for transfer/revoke) */}
          {(isTransfer || isRevoke) && (
            <div className="space-y-2">
              <Label htmlFor="fromPlayer">From Player</Label>
              <PlayerCombobox
                value={formData.fromPlayer}
                onValueChange={(value) => setFormData(prev => ({ ...prev, fromPlayer: value }))}
                placeholder="Select current owner..."
              />
            </div>
          )}

          {/* To Player (for unbox/grant/transfer) */}
          {(isUnboxOrGrant || isTransfer) && (
            <div className="space-y-2">
              <Label htmlFor="toPlayer">To Player</Label>
              <PlayerCombobox
                value={formData.toPlayer}
                onValueChange={(value) => setFormData(prev => ({ ...prev, toPlayer: value }))}
                placeholder="Select recipient..."
              />
            </div>
          )}

          {/* Timestamp */}
          <div className="space-y-2">
            <Label htmlFor="occurredAt">When did this occur?</Label>
            <Input
              id="occurredAt"
              type="datetime-local"
              value={formData.occurredAt}
              onChange={(e) => setFormData(prev => ({ ...prev, occurredAt: e.target.value }))}
            />
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <ul className="space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.action}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
