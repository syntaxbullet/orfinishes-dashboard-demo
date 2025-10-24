import * as React from "react"
import { Loader2, Plus, Sparkles, Gift, ArrowRightLeft, X, RefreshCw } from "lucide-react"

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
import { Separator } from "@/components/ui/separator"
import { PlayerCombobox } from "@/components/log-event-form/player-combobox"
import { CosmeticCombobox } from "@/components/log-event-form/cosmetic-combobox"
import { FinishTypeCombobox } from "@/components/log-event-form/finish-type-combobox"
import { ItemSearchCombobox } from "@/components/log-event-form/item-search-combobox"
import { ACTION_LABELS, ACTION_DESCRIPTIONS, validateEventData } from "@/lib/event-utils"
import { createItem, createOwnershipEvent, type OwnershipAction } from "@/utils/supabase"

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

  const handleRefresh = () => {
    // Clear form and errors to force fresh data loading
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
      let itemId = formData.itemId

      // For unbox/grant actions, we need to create the item first
      if (isUnboxOrGrant) {
        const itemData = {
          cosmetic: formData.cosmeticId,
          finish_type: formData.finishType,
          current_owner: formData.toPlayer,
          minted_by: formData.toPlayer,
          minted_at: formData.occurredAt,
        }

        const newItem = await createItem(itemData)
        itemId = newItem.id
      }

      const eventData = {
        item_id: itemId,
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
      
      // Parse error message for better user feedback
      let errorMessage = "Failed to create event. Please try again."
      
      if (error instanceof Error) {
        if (error.message.includes("invalid input syntax for type uuid")) {
          errorMessage = "One or more selected items have invalid IDs. Please refresh and try again."
        } else if (error.message.includes("foreign key constraint")) {
          errorMessage = "Selected item or player no longer exists. Please refresh and try again."
        } else if (error.message.includes("duplicate key")) {
          errorMessage = "This event already exists. Please check your data and try again."
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      setErrors([errorMessage])
    } finally {
      setIsSubmitting(false)
    }
  }

  const isUnboxOrGrant = formData.action === "unbox" || formData.action === "grant"
  const isTransfer = formData.action === "transfer"
  const isRevoke = formData.action === "revoke"

  const getActionIcon = (action: string) => {
    switch (action) {
      case "unbox": return <Sparkles className="h-4 w-4" />
      case "grant": return <Gift className="h-4 w-4" />
      case "transfer": return <ArrowRightLeft className="h-4 w-4" />
      case "revoke": return <X className="h-4 w-4" />
      default: return <Plus className="h-4 w-4" />
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {getActionIcon(formData.action)}
            </div>
            <div>
              <SheetTitle className="text-xl">
                {formData.action ? ACTION_LABELS[formData.action as keyof typeof ACTION_LABELS] : "Log Event"}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {formData.action 
                  ? ACTION_DESCRIPTIONS[formData.action as keyof typeof ACTION_DESCRIPTIONS]
                  : "Create a new ownership event or transfer an existing item."
                }
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-8 mt-8">
          {/* Action Type */}
          <div className="space-y-3">
            <Label htmlFor="action" className="text-sm font-medium">Action Type</Label>
            <Select
              value={formData.action}
              onValueChange={(value) => setFormData(prev => ({ ...prev, action: value as OwnershipAction }))}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose what you want to do..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="py-3">
                    <div className="flex items-center gap-3">
                      {getActionIcon(key)}
                      <div className="flex flex-col">
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">
                          {ACTION_DESCRIPTIONS[key as keyof typeof ACTION_DESCRIPTIONS]}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.action && (
            <>
              <Separator />
              <div className="space-y-6">

                {/* Item Selection (for transfer/revoke) */}
                {(isTransfer || isRevoke) && (
                  <div className="space-y-3">
                    <Label htmlFor="item" className="text-sm font-medium">Item</Label>
                    <ItemSearchCombobox
                      value={formData.itemId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, itemId: value }))}
                      placeholder="Search for an item..."
                    />
                  </div>
                )}

                {/* Cosmetic Selection (for unbox/grant) */}
                {isUnboxOrGrant && (
                  <div className="space-y-3">
                    <Label htmlFor="cosmetic" className="text-sm font-medium">Cosmetic</Label>
                    <CosmeticCombobox
                      value={formData.cosmeticId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, cosmeticId: value }))}
                      placeholder="Select a cosmetic..."
                    />
                  </div>
                )}

                {/* Finish Type (for unbox/grant) */}
                {isUnboxOrGrant && (
                  <div className="space-y-3">
                    <Label htmlFor="finishType" className="text-sm font-medium">Finish Type</Label>
                    <FinishTypeCombobox
                      value={formData.finishType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, finishType: value }))}
                      placeholder="Select finish type..."
                    />
                  </div>
                )}

                {/* From Player (for transfer/revoke) */}
                {(isTransfer || isRevoke) && (
                  <div className="space-y-3">
                    <Label htmlFor="fromPlayer" className="text-sm font-medium">From Player</Label>
                    <PlayerCombobox
                      value={formData.fromPlayer}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, fromPlayer: value }))}
                      placeholder="Select current owner..."
                    />
                  </div>
                )}

                {/* To Player (for unbox/grant/transfer) */}
                {(isUnboxOrGrant || isTransfer) && (
                  <div className="space-y-3">
                    <Label htmlFor="toPlayer" className="text-sm font-medium">To Player</Label>
                    <PlayerCombobox
                      value={formData.toPlayer}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, toPlayer: value }))}
                      placeholder="Select recipient..."
                    />
                  </div>
                )}

                {/* Timestamp */}
                <div className="space-y-3">
                  <Label htmlFor="occurredAt" className="text-sm font-medium">When did this occur?</Label>
                  <Input
                    id="occurredAt"
                    type="datetime-local"
                    value={formData.occurredAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, occurredAt: e.target.value }))}
                    className="h-12"
                  />
                </div>
              </div>
            </>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-destructive">Please fix the following errors:</h4>
                  <ul className="mt-2 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm text-destructive">
                        • {error}
                      </li>
                    ))}
                  </ul>
                  {errors.some(error => error.includes("refresh") || error.includes("stale")) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      className="mt-3 h-8"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Refresh Data
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {formData.action && (
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.action}
                className="flex-1 h-12"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  <>
                    {getActionIcon(formData.action)}
                    <span className="ml-2">
                      {formData.action === "unbox" && "Unbox Item"}
                      {formData.action === "grant" && "Grant Item"}
                      {formData.action === "transfer" && "Transfer Item"}
                      {formData.action === "revoke" && "Revoke Item"}
                    </span>
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}
