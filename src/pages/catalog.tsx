import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { numberFormatter, dateFormatter, dateTimeFormatter } from "@/lib/formatters"
import { fetchCosmetics, type CosmeticRecord } from "@/utils/supabase"

type CosmeticRow = {
  id: string
  name: string
  category: string
  source: string | null
  exclusiveToYear: number | null
  lastTouchedAt: string
  lastTouchedTimestamp: number
  createdAt: string
  updatedAt: string | null
}

const catalogColumns: ColumnDef<CosmeticRow>[] = [
  {
    accessorKey: "name",
    header: "Cosmetic",
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium text-foreground">{row.getValue("name")}</p>
        <p className="text-xs text-muted-foreground">{row.original.category}</p>
      </div>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {row.original.source ?? "Unknown"}
      </span>
    ),
  },
  {
    accessorKey: "exclusiveToYear",
    header: "Exclusive To Year",
    cell: ({ row }) => {
      const value = row.original.exclusiveToYear
      if (!value) {
        return <span className="text-sm text-muted-foreground">None</span>
      }

      return (
        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
          {value}
        </span>
      )
    },
    sortingFn: (a, b) => {
      const max = Number.MAX_SAFE_INTEGER
      const aValue = a.original.exclusiveToYear ?? max
      const bValue = b.original.exclusiveToYear ?? max
      return aValue - bValue
    },
  },
  {
    accessorKey: "lastTouchedAt",
    header: "Last touched",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {dateFormatter.format(new Date(row.original.lastTouchedAt))}
      </span>
    ),
    sortingFn: (a, b) =>
      a.original.lastTouchedTimestamp - b.original.lastTouchedTimestamp,
  },
]

export function CatalogPage() {
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [cosmetics, setCosmetics] = React.useState<CosmeticRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadCosmetics = React.useCallback(async (options?: { forceRefresh?: boolean }) => {
    const forceRefresh = options?.forceRefresh ?? false
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchCosmetics({ forceRefresh })
      setCosmetics(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load cosmetics from Supabase.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadCosmetics()
  }, [loadCosmetics])

  const tableData = React.useMemo<CosmeticRow[]>(() => {
    return cosmetics.map((cosmetic) => {
      const lastTouchedAt = cosmetic.updated_at ?? cosmetic.created_at
      const parsedLastTouched = Date.parse(lastTouchedAt)
      const createdAtTimestamp = Date.parse(cosmetic.created_at)

      return {
        id: cosmetic.id,
        name: cosmetic.name,
        category: cosmetic.type || "Uncategorized",
        source: cosmetic.source,
        exclusiveToYear: cosmetic.exclusive_to_year,
        lastTouchedAt,
        lastTouchedTimestamp: Number.isNaN(parsedLastTouched)
          ? createdAtTimestamp
          : parsedLastTouched,
        createdAt: cosmetic.created_at,
        updatedAt: cosmetic.updated_at,
      }
    })
  }, [cosmetics])

  const categoryOptions = React.useMemo(() => {
    const categories = new Set<string>()
    for (const item of tableData) {
      categories.add(item.category)
    }

    return ["all", ...Array.from(categories).sort((a, b) => a.localeCompare(b))]
  }, [tableData])

  React.useEffect(() => {
    if (categoryFilter !== "all" && !categoryOptions.includes(categoryFilter)) {
      setCategoryFilter("all")
    }
  }, [categoryFilter, categoryOptions])

  const filteredCosmetics = React.useMemo(() => {
    if (categoryFilter === "all") {
      return tableData
    }

    return tableData.filter((item) => item.category === categoryFilter)
  }, [categoryFilter, tableData])

  const totalCosmetics = tableData.length
  const exclusiveCosmetics = tableData.filter(
    (item) => item.exclusiveToYear !== null,
  ).length
  const nonExclusiveCosmetics = totalCosmetics - exclusiveCosmetics

  const latestEntry = React.useMemo(() => {
    if (!tableData.length) {
      return null
    }

    return tableData.reduce<CosmeticRow | null>((latest, item) => {
      if (!latest) {
        return item
      }

      return item.lastTouchedTimestamp > latest.lastTouchedTimestamp
        ? item
        : latest
    }, null)
  }, [tableData])

  const statCards = [
    {
      label: "Catalog size",
      value: numberFormatter.format(totalCosmetics),
      detail: totalCosmetics
        ? `Non-exclusive ${numberFormatter.format(
            nonExclusiveCosmetics,
          )} · Exclusive ${numberFormatter.format(exclusiveCosmetics)}`
        : "No cosmetics found in Supabase.",
    },
    {
      label: "Latest update",
      value: latestEntry
        ? dateTimeFormatter.format(new Date(latestEntry.lastTouchedAt))
        : "—",
      detail: latestEntry
        ? `Last changed cosmetic: ${latestEntry.name}`
        : "Awaiting the first catalog update.",
    },
  ]

  const insights = React.useMemo(() => {
    if (!tableData.length) {
      return []
    }

    const typeCounts = new Map<string, number>()
    for (const item of tableData) {
      typeCounts.set(item.category, (typeCounts.get(item.category) ?? 0) + 1)
    }

    let topCategory = ""
    let topCategoryCount = 0
    for (const [category, count] of typeCounts.entries()) {
      if (count > topCategoryCount) {
        topCategory = category
        topCategoryCount = count
      }
    }

    const exclusiveYears = Array.from(
      new Set(
        tableData
          .filter((item) => item.exclusiveToYear !== null)
          .map((item) => item.exclusiveToYear as number),
      ),
    ).sort((a, b) => a - b)

    const missingSourceCount = tableData.filter((item) => !item.source).length

    const formattedYears =
      exclusiveYears.length === 0
        ? null
        : exclusiveYears.length <= 4
          ? exclusiveYears.join(", ")
          : `${exclusiveYears.slice(0, 3).join(", ")}, +${
              exclusiveYears.length - 3
            } more`

    return [
      topCategory
        ? {
            label: "Most common type",
            value: `${topCategory} · ${numberFormatter.format(
              topCategoryCount,
            )} cosmetics`,
          }
        : {
            label: "Most common type",
            value: "Type metadata missing",
          },
      {
        label: "Exclusive programs",
        value: formattedYears ?? "None recorded",
      },
      {
        label: "Missing source metadata",
        value: missingSourceCount
          ? `${numberFormatter.format(
              missingSourceCount,
            )} cosmetics need a source`
          : "All cosmetics have a source",
      },
    ]
  }, [tableData])

  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Cosmetics Catalog
        </h1>
        <p className="text-sm text-muted-foreground">
          Grounded readout of `public.cosmetics`, including exclusive programs
          and the most recently touched entries.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {card.label}
            </p>
            {isLoading ? (
              <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {card.value}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {isLoading ? (
                <span className="inline-block h-3 w-32 animate-pulse rounded bg-muted" />
              ) : (
                card.detail
              )}
            </p>
          </div>
        ))}
      </div>


      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-none">
            Catalog entries
          </h2>
          <p className="text-xs text-muted-foreground">
            Live snapshot of cosmetics stored in `public.cosmetics`.
          </p>
        </div>

        <div className="mt-6">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-6 text-center">
              <p className="text-sm font-medium text-destructive">
                Failed to load catalog data.
          </p>
          <p className="text-xs text-destructive">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadCosmetics({ forceRefresh: true })}
          >
            Retry
          </Button>
        </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading catalog...
            </div>
          ) : (
            <DataTable
              columns={catalogColumns}
              data={filteredCosmetics}
              filterColumn="name"
              filterPlaceholder="Search cosmetics..."
              entityLabel="cosmetics"
              renderToolbar={(table) => {
                const nameColumn = table.getColumn("name")
                const searchValue =
                  (nameColumn?.getFilterValue() as string | undefined) ?? ""
                const isFiltered =
                  Boolean(searchValue) || categoryFilter !== "all"

                return (
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        value={searchValue}
                        onChange={(event) =>
                          nameColumn?.setFilterValue(event.target.value)
                        }
                        placeholder="Search cosmetics..."
                        className="w-full sm:max-w-xs"
                      />

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Type
                        </span>
                        <select
                          value={categoryFilter}
                          onChange={(event) => {
                            setCategoryFilter(event.target.value)
                            table.setPageIndex(0)
                          }}
                          className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {categoryOptions.map((option) => (
                            <option key={option} value={option}>
                              {option === "all" ? "All types" : option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isFiltered ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          table.resetColumnFilters()
                          table.setPageIndex(0)
                          setCategoryFilter("all")
                        }}
                      >
                        Reset filters
                      </Button>
                    ) : null}
                  </div>
                )
              }}
            />
          )}
        </div>
      </div>
    </section>
  )
}

export default CatalogPage
