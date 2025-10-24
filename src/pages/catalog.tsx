import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Loader2 } from "lucide-react"

import { DataTable } from "@/components/ui/data-table"
import { StatCard } from "@/components/stat-card"
import { ErrorDisplay } from "@/components/error-display"
import { DataTableToolbar, DataTableSearch, DataTableFilter } from "@/components/data-table-toolbar"
import { useDataLoader } from "@/hooks/use-data-loader"
import { numberFormatter, dateFormatter, dateTimeFormatter } from "@/lib/formatters"
import { fetchCosmetics } from "@/utils/supabase"

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

  // Use the data loader hook for managing loading states
  const dataLoader = useDataLoader(async () => {
    return await fetchCosmetics()
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cosmetics = dataLoader.data || []


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
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
            isLoading={dataLoader.isLoading}
          />
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
          {dataLoader.error ? (
            <ErrorDisplay
              error={dataLoader.error}
              title="Failed to load catalog data."
              onRetry={() => {
                void dataLoader.load()
              }}
            />
          ) : dataLoader.isLoading ? (
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

                const filterOptions = categoryOptions.map(option => ({
                  value: option,
                  label: option === "all" ? "All types" : option
                }))

                return (
                  <DataTableToolbar
                    hasFilters={isFiltered}
                    onReset={() => {
                      table.resetColumnFilters()
                      table.setPageIndex(0)
                      setCategoryFilter("all")
                    }}
                  >
                    <DataTableSearch
                      column={nameColumn}
                      placeholder="Search cosmetics..."
                    />
                    <DataTableFilter
                      value={categoryFilter}
                      onChange={(value) => {
                        setCategoryFilter(value)
                        table.setPageIndex(0)
                      }}
                      options={filterOptions}
                      label="Type"
                    />
                  </DataTableToolbar>
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
