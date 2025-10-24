import * as React from "react"
import {
  ArrowRightLeft,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Gift,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { PlayerAvatar } from "@/components/player-avatar"
import { PlayerCombobox, type PlayerSelection } from "@/components/log-event-form/player-combobox"
import { CosmeticCombobox } from "@/components/log-event-form/cosmetic-combobox"
import { FinishTypeCombobox } from "@/components/log-event-form/finish-type-combobox"
import { ItemSearchCombobox, type ItemWithMetadata } from "@/components/log-event-form/item-search-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ACTION_DESCRIPTIONS, ACTION_LABELS, validateEventData } from "@/lib/event-utils"
import { dateTimeFormatter } from "@/lib/formatters"
import { createPlayerDisplayInfo } from "@/lib/player-utils"
import { cn } from "@/lib/utils"
import {
  createItem,
  createOwnershipEvent,
  type CosmeticRecord,
  type OwnershipAction,
} from "@/utils/supabase"

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

type ActionStyling = {
  icon: LucideIcon
  buttonActive: string
  iconAccent: string
  callout: string
  subtle: string
}

const ACTION_CONFIG: Record<OwnershipAction, ActionStyling> = {
  unbox: {
    icon: Sparkles,
    buttonActive: "border-violet-500/60 bg-violet-500/10 ring-violet-500/30",
    iconAccent: "bg-violet-500/20 text-violet-600 dark:text-violet-300 dark:bg-violet-500/25",
    callout: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200",
    subtle: "text-violet-600 dark:text-violet-300",
  },
  grant: {
    icon: Gift,
    buttonActive: "border-emerald-500/60 bg-emerald-500/10 ring-emerald-500/30",
    iconAccent: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-200 dark:bg-emerald-500/25",
    callout: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    subtle: "text-emerald-600 dark:text-emerald-300",
  },
  transfer: {
    icon: ArrowRightLeft,
    buttonActive: "border-sky-500/60 bg-sky-500/10 ring-sky-500/30",
    iconAccent: "bg-sky-500/20 text-sky-600 dark:text-sky-200 dark:bg-sky-500/25",
    callout: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
    subtle: "text-sky-600 dark:text-sky-300",
  },
  revoke: {
    icon: X,
    buttonActive: "border-destructive/60 bg-destructive/10 ring-destructive/30",
    iconAccent: "bg-destructive/20 text-destructive dark:bg-destructive/30",
    callout: "border-destructive/60 bg-destructive/10 text-destructive dark:text-destructive",
    subtle: "text-destructive",
  },
}

const SUBMIT_LABELS: Record<OwnershipAction, string> = {
  unbox: "Unbox item",
  grant: "Grant item",
  transfer: "Transfer item",
  revoke: "Revoke item",
}

function createInitialFormState(): FormData {
  return {
    action: "",
    itemId: "",
    cosmeticId: "",
    finishType: "",
    fromPlayer: "",
    toPlayer: "",
    occurredAt: new Date().toISOString().slice(0, 16),
  }
}

export function LogEventSheet({ open, onOpenChange }: LogEventSheetProps) {
  const [formData, setFormData] = React.useState<FormData>(() => createInitialFormState())
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])

  const [selectedItem, setSelectedItem] = React.useState<ItemWithMetadata | null>(null)
  const [selectedCosmetic, setSelectedCosmetic] = React.useState<CosmeticRecord | null>(null)
  const [selectedFromPlayer, setSelectedFromPlayer] = React.useState<PlayerSelection | null>(null)
  const [selectedToPlayer, setSelectedToPlayer] = React.useState<PlayerSelection | null>(null)
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setFormData(createInitialFormState())
      setErrors([])
      setSelectedItem(null)
      setSelectedCosmetic(null)
      setSelectedFromPlayer(null)
      setSelectedToPlayer(null)
      setIsMobileSummaryOpen(false)
    }
  }, [open])

  const isUnboxOrGrant = formData.action === "unbox" || formData.action === "grant"
  const isTransfer = formData.action === "transfer"
  const isRevoke = formData.action === "revoke"
  const disableInputs = isSubmitting

  const activeActionConfig = formData.action ? ACTION_CONFIG[formData.action] : null
  const ActiveActionIcon = activeActionConfig?.icon ?? Plus
  const submitLabel = formData.action ? SUBMIT_LABELS[formData.action] : "Create event"

  const handleActionChange = React.useCallback((action: OwnershipAction) => {
    setFormData((prev) => {
      if (prev.action === action) {
        return prev
      }

      return {
        ...prev,
        action,
        itemId: "",
        cosmeticId: "",
        finishType: "",
        fromPlayer: "",
        toPlayer: "",
      }
    })

    setSelectedItem(null)
    setSelectedCosmetic(null)
    setSelectedFromPlayer(null)
    setSelectedToPlayer(null)
    setErrors([])
  }, [])

  const handleRefresh = React.useCallback(() => {
    setFormData(createInitialFormState())
    setErrors([])
    setSelectedItem(null)
    setSelectedCosmetic(null)
    setSelectedFromPlayer(null)
    setSelectedToPlayer(null)
    setIsMobileSummaryOpen(false)
  }, [])

  const handleItemSelectionChange = React.useCallback(
    (itemWithMetadata: ItemWithMetadata | null) => {
      let nextFromSelection: PlayerSelection | null | undefined

      setSelectedItem(itemWithMetadata)
      setFormData((prev) => {
        const next: FormData = {
          ...prev,
          itemId: itemWithMetadata?.item.id ?? "",
        }

        if (prev.action === "transfer" || prev.action === "revoke") {
          const ownerRecord = itemWithMetadata?.owner ?? null
          next.fromPlayer = ownerRecord?.id ?? ""

          nextFromSelection = ownerRecord
            ? {
                record: ownerRecord,
                displayInfo: createPlayerDisplayInfo(ownerRecord, 32),
              }
            : null
        }

        return next
      })

      if (nextFromSelection !== undefined) {
        setSelectedFromPlayer(nextFromSelection)
      }
    },
    [setSelectedFromPlayer],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrors([])

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
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create ownership event:", error)

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl">
        <SheetHeader className="border-b border-border/60 pb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                    activeActionConfig?.iconAccent,
                  )}
                >
                  <ActiveActionIcon className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <SheetTitle className="text-xl">
                    {formData.action ? ACTION_LABELS[formData.action] : "Log Event"}
                  </SheetTitle>
                  <SheetDescription className="text-sm">
                    {formData.action
                      ? ACTION_DESCRIPTIONS[formData.action]
                      : "Create a new ownership event or transfer an existing item."}
                  </SheetDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isSubmitting}
                className="self-start"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset form
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Follow the prompts below to capture the item, participants, and timing. The live preview on the
              right keeps everything in view as you go.
            </p>
          </div>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          <div className="lg:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMobileSummaryOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl border-border/70 bg-background px-4 py-3 text-left"
            >
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Event summary</span>
                <span className="text-xs text-muted-foreground">
                  Keep track of item, participants, and timing.
                </span>
              </span>
              {isMobileSummaryOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            {isMobileSummaryOpen ? (
              <div className="mt-4">
                <EventSummaryCard
                  action={formData.action}
                  itemId={formData.itemId}
                  cosmeticId={formData.cosmeticId}
                  finishType={formData.finishType}
                  occurredAt={formData.occurredAt}
                  item={selectedItem}
                  cosmetic={selectedCosmetic}
                  fromPlayer={selectedFromPlayer}
                  toPlayer={selectedToPlayer}
                  isUnboxOrGrant={isUnboxOrGrant}
                  isTransfer={isTransfer}
                  isRevoke={isRevoke}
                  isSubmitting={isSubmitting}
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <form onSubmit={handleSubmit} className="space-y-10">
              <section className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1</p>
                  <h3 className="text-lg font-semibold text-foreground">Choose what happened</h3>
                  <p className="text-sm text-muted-foreground">
                  Pick the type of ownership event to unlock the relevant fields.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(ACTION_LABELS) as OwnershipAction[]).map((action) => {
                  const config = ACTION_CONFIG[action]
                  const Icon = config.icon
                  const isActive = formData.action === action

                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleActionChange(action)}
                      className={cn(
                        "group flex w-full flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        isActive
                          ? cn(
                              config.buttonActive,
                              "shadow-md hover:shadow-lg focus-visible:ring-offset-2",
                            )
                          : "hover:border-border/80",
                      )}
                      aria-pressed={isActive}
                    >
                      <span
                        className={cn(
                          "inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors",
                          isActive && config.subtle,
                        )}
                      >
                        {ACTION_LABELS[action]}
                      </span>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                            isActive && config.iconAccent,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {ACTION_DESCRIPTIONS[action]}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {formData.action ? (
              <>
                <Separator />

                <section className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Item details
                    </h4>

                    {(isTransfer || isRevoke) && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-base font-semibold text-foreground">
                            {isRevoke ? "Which item are you revoking?" : "Which item are you transferring?"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleItemSelectionChange(null)
                            }}
                            disabled={!formData.itemId || isSubmitting}
                          >
                            Clear
                          </Button>
                        </div>
                        <ItemSearchCombobox
                          value={formData.itemId}
                          onValueChange={(value) => {
                            setFormData((prev) => ({ ...prev, itemId: value }))
                          }}
                          onSelectionChange={handleItemSelectionChange}
                          placeholder="Search by cosmetic name, finish, or owner..."
                          disabled={disableInputs}
                        />
                        <p className="text-xs text-muted-foreground">
                          You can search by cosmetic name, finish type, or the current owner to quickly narrow the list.
                        </p>
                      </div>
                    )}

                    {isUnboxOrGrant ? (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-base font-semibold text-foreground">Cosmetic</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, cosmeticId: "" }))
                                setSelectedCosmetic(null)
                              }}
                              disabled={!formData.cosmeticId || isSubmitting}
                            >
                              Clear
                            </Button>
                          </div>
                          <CosmeticCombobox
                            value={formData.cosmeticId}
                            onValueChange={(value) => {
                              setFormData((prev) => ({ ...prev, cosmeticId: value }))
                            }}
                            onSelectionChange={setSelectedCosmetic}
                            placeholder="Select a cosmetic..."
                            disabled={disableInputs}
                          />
                          <p className="text-xs text-muted-foreground">
                            We&apos;ll mint a new item with this cosmetic and assign it to the recipient.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-base font-semibold text-foreground">Finish type</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, finishType: "" }))
                              }}
                              disabled={!formData.finishType || isSubmitting}
                            >
                              Clear
                            </Button>
                          </div>
                          <FinishTypeCombobox
                            value={formData.finishType}
                            onValueChange={(value) => {
                              setFormData((prev) => ({ ...prev, finishType: value }))
                            }}
                            placeholder="Select finish type..."
                            disabled={disableInputs}
                          />
                          <p className="text-xs text-muted-foreground">
                            Start typing to find an existing finish type or pick from the most common options.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Participants
                    </h4>
                    <div className="grid gap-6 md:grid-cols-2">
                      {(isTransfer || isRevoke) && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-base font-semibold text-foreground">
                              {isRevoke ? "Current owner" : "From player"}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, fromPlayer: "" }))
                                setSelectedFromPlayer(null)
                              }}
                              disabled={!formData.fromPlayer || isSubmitting}
                            >
                              Clear
                            </Button>
                          </div>
                          <PlayerCombobox
                            value={formData.fromPlayer}
                            onValueChange={(value) => {
                              setFormData((prev) => ({ ...prev, fromPlayer: value }))
                            }}
                            onSelectionChange={setSelectedFromPlayer}
                            externalSelection={selectedFromPlayer}
                            placeholder="Select current owner..."
                            disabled={disableInputs}
                          />
                          <p className="text-xs text-muted-foreground">
                            Choose who currently holds the item before this event takes place.
                          </p>
                        </div>
                      )}

                      {(isUnboxOrGrant || isTransfer) && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-base font-semibold text-foreground">To player</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, toPlayer: "" }))
                                setSelectedToPlayer(null)
                              }}
                              disabled={!formData.toPlayer || isSubmitting}
                            >
                              Clear
                            </Button>
                          </div>
                          <PlayerCombobox
                            value={formData.toPlayer}
                            onValueChange={(value) => {
                              setFormData((prev) => ({ ...prev, toPlayer: value }))
                            }}
                            onSelectionChange={setSelectedToPlayer}
                            externalSelection={selectedToPlayer}
                            placeholder="Select recipient..."
                            disabled={disableInputs}
                          />
                          <p className="text-xs text-muted-foreground">
                            Pick who should receive the item after this event is recorded.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Timing
                    </h4>
                    <div className="space-y-2">
                      <Label htmlFor="occurredAt" className="text-base font-semibold text-foreground">
                        When did this occur?
                      </Label>
                      <Input
                        id="occurredAt"
                        type="datetime-local"
                        value={formData.occurredAt}
                        onChange={(event) => {
                          const value = event.target.value
                          setFormData((prev) => ({ ...prev, occurredAt: value }))
                        }}
                        className="h-12"
                        disabled={disableInputs}
                      />
                      <p className="text-xs text-muted-foreground">
                        Times are stored in UTC and displayed in your local timezone for convenience.
                      </p>
                    </div>
                  </div>
                </section>

                {errors.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                    <div className="flex items-start gap-2">
                      <X className="mt-0.5 h-4 w-4 text-destructive" />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-destructive">
                          Please fix the following issues:
                        </p>
                        <ul className="space-y-1">
                          {errors.map((error, index) => (
                            <li key={index} className="text-sm text-destructive">
                              • {error}
                            </li>
                          ))}
                        </ul>
                        {errors.some(
                          (error) => error.includes("refresh") || error.includes("stale"),
                        ) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            className="mt-2 h-8"
                          >
                            <RefreshCw className="mr-2 h-3 w-3" />
                            Refresh data
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="h-12 sm:min-w-[120px]"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 sm:min-w-[160px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating event...
                      </>
                    ) : (
                      <>
                        <ActiveActionIcon className="mr-2 h-4 w-4" />
                        {submitLabel}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : null}
            </form>

            <div className="hidden lg:block">
              <EventSummaryCard
                action={formData.action}
                itemId={formData.itemId}
                cosmeticId={formData.cosmeticId}
                finishType={formData.finishType}
                occurredAt={formData.occurredAt}
                item={selectedItem}
                cosmetic={selectedCosmetic}
                fromPlayer={selectedFromPlayer}
                toPlayer={selectedToPlayer}
                isUnboxOrGrant={isUnboxOrGrant}
                isTransfer={isTransfer}
                isRevoke={isRevoke}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type EventSummaryCardProps = {
  action: OwnershipAction | ""
  itemId: string
  cosmeticId: string
  finishType: string
  occurredAt: string
  item: ItemWithMetadata | null
  cosmetic: CosmeticRecord | null
  fromPlayer: PlayerSelection | null
  toPlayer: PlayerSelection | null
  isUnboxOrGrant: boolean
  isTransfer: boolean
  isRevoke: boolean
  isSubmitting: boolean
}

function EventSummaryCard({
  action,
  itemId,
  cosmeticId,
  finishType,
  occurredAt,
  item,
  cosmetic,
  fromPlayer,
  toPlayer,
  isUnboxOrGrant,
  isTransfer,
  isRevoke,
  isSubmitting,
}: EventSummaryCardProps) {
  const config = action ? ACTION_CONFIG[action] : null
  const ActionIcon = config?.icon ?? Plus

  const assetTitle = React.useMemo(() => {
    if (isUnboxOrGrant) {
      if (cosmetic?.name) {
        return cosmetic.name
      }
      if (cosmeticId) {
        return `Cosmetic ${cosmeticId.slice(0, 8)}…`
      }
      return "Select a cosmetic"
    }

    if (item?.cosmetic?.name) {
      return item.cosmetic.name
    }

    if (item) {
      return `Item ${item.item.id.slice(0, 8)}…`
    }

    if (itemId) {
      return `Item ${itemId.slice(0, 8)}…`
    }

    return "Select an item"
  }, [cosmetic, cosmeticId, isUnboxOrGrant, item, itemId])

  const assetSubtitle = React.useMemo(() => {
    if (isUnboxOrGrant) {
      const finish = finishType ? `${finishType} finish` : "Finish type pending"
      const cosmeticType = cosmetic?.type ? `• ${cosmetic.type}` : ""
      return `${finish} ${cosmeticType}`.trim()
    }

    if (item) {
      const finish = item.item.finish_type || "Unknown finish"
      const ownerName = item.owner?.display_name || "Unassigned"
      return `${finish} • ${ownerName}`
    }

    if (itemId) {
      return "Existing item will be used"
    }

    return "Search for an item to continue"
  }, [cosmetic, finishType, isUnboxOrGrant, item, itemId])

  const occurredTimestamp = occurredAt ? Date.parse(occurredAt) : Number.NaN
  const occurredDisplay = Number.isNaN(occurredTimestamp)
    ? "Waiting for a timestamp"
    : dateTimeFormatter.format(new Date(occurredTimestamp))

  const calloutMessage = React.useMemo(() => {
    switch (action) {
      case "unbox":
      case "grant":
        return "A brand new item will be minted for the selected cosmetic and handed to the recipient automatically."
      case "transfer":
        return "The existing item will keep its history while the owner is updated to the selected recipient."
      case "revoke":
        return "The item will remain in the inventory but without an assigned owner after this event."
      default:
        return null
    }
  }, [action])

  const hasFromParticipant = (isTransfer || isRevoke) && Boolean(fromPlayer)
  const hasToParticipant = (isUnboxOrGrant || isTransfer) && Boolean(toPlayer)

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground",
              config?.iconAccent,
            )}
          >
            <ActionIcon className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {action ? ACTION_LABELS[action] : "Event preview"}
            </p>
            <p className="text-xs text-muted-foreground">
              {action
                ? ACTION_DESCRIPTIONS[action]
                : "Selections will appear here as you fill out the form."}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <SummaryRow icon={Package} iconClassName={config?.iconAccent} label={isUnboxOrGrant ? "New item" : "Item"}>
            <p className="text-sm font-medium text-foreground">{assetTitle}</p>
            <p className="text-xs text-muted-foreground">{assetSubtitle}</p>
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                config?.subtle,
              )}
            >
              {isUnboxOrGrant ? "Mint on submit" : "Existing asset"}
            </span>
          </SummaryRow>

          <SummaryRow icon={Users} iconClassName={config?.iconAccent} label="Participants">
            <div className="space-y-2">
              {(isTransfer || isRevoke) && (
                <ParticipantSummaryRow
                  label={isRevoke ? "Current owner" : "From"}
                  participant={fromPlayer}
                />
              )}
              {(isUnboxOrGrant || isTransfer) && (
                <ParticipantSummaryRow label="To" participant={toPlayer} />
              )}
              {!hasFromParticipant && !hasToParticipant && (
                <p className="text-sm text-muted-foreground">
                  Select the players involved to finish setting up the event.
                </p>
              )}
            </div>
          </SummaryRow>

          <SummaryRow icon={CalendarClock} iconClassName={config?.iconAccent} label="Occurred">
            <p className="text-sm font-medium text-foreground">{occurredDisplay}</p>
            <p className="text-xs text-muted-foreground">
              {Number.isNaN(occurredTimestamp)
                ? "Set the date and time to keep the ledger tidy."
                : "Stored in UTC and shown in your local timezone."}
            </p>
          </SummaryRow>
        </div>

        {calloutMessage ? (
          <div
            className={cn(
              "mt-5 rounded-xl border px-4 py-3 text-xs leading-relaxed",
              config?.callout ?? "border-border/60 bg-muted/30 text-muted-foreground",
            )}
          >
            {calloutMessage}
          </div>
        ) : null}

        {isSubmitting ? (
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Logging event…
          </div>
        ) : null}
      </div>
    </aside>
  )
}

type SummaryRowProps = {
  icon: LucideIcon
  iconClassName?: string | null
  label: string
  children: React.ReactNode
}

function SummaryRow({ icon: Icon, iconClassName, label, children }: SummaryRowProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            iconClassName,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="space-y-1 text-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}

function ParticipantSummaryRow({
  label,
  participant,
}: {
  label: string
  participant: PlayerSelection | null
}) {
  if (!participant) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/40 p-2">
        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <p className="text-sm text-muted-foreground">Not selected</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/70 p-2">
      <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <PlayerAvatar profile={participant.displayInfo} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {participant.displayInfo.displayName}
        </p>
        {participant.displayInfo.minecraftUuid ? (
          <p className="truncate text-xs text-muted-foreground">
            {participant.displayInfo.minecraftUuid}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default LogEventSheet
