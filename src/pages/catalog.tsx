import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"

const catalogHighlights = [
  {
    label: "Total cosmetics",
    value: "312",
    detail: "Tracked across 9 collections",
  },
  {
    label: "Finish variants",
    value: "17",
    detail: "Includes seasonal exclusives",
  },
  {
    label: "Needs source review",
    value: "5",
    detail: "Missing supplier metadata",
  },
]

const upcomingTasks = [
  "Backfill exclusive_to_year for legacy drops (<= 2019).",
  "Tag cosmetics missing rarity notes before the next sync.",
  "Confirm trigger coverage for set_updated_at after manual edits.",
]

type CosmeticRow = {
  id: string
  name: string
  category: string
  source: string
  exclusiveToYear: number | null
  finishVariants: number
  updatedAt: string
}

const cosmeticsCatalog: CosmeticRow[] = [
  {
    id: "nebula-visor",
    name: "Nebula Visor",
    category: "Headgear",
    source: "Aurora Season Pass",
    exclusiveToYear: 2025,
    finishVariants: 6,
    updatedAt: "2025-10-14T18:42:00Z",
  },
  {
    id: "holo-shard-cape",
    name: "Holo Shard Cape",
    category: "Backwear",
    source: "Radiant Cache",
    exclusiveToYear: null,
    finishVariants: 4,
    updatedAt: "2025-10-13T12:15:00Z",
  },
  {
    id: "prism-trail-boots",
    name: "Prism Trail Boots",
    category: "Footwear",
    source: "Prism League Ladder",
    exclusiveToYear: 2024,
    finishVariants: 5,
    updatedAt: "2025-10-12T08:20:00Z",
  },
  {
    id: "celestine-pauldrons",
    name: "Celestine Pauldrons",
    category: "Armor",
    source: "Vault of Echoes",
    exclusiveToYear: null,
    finishVariants: 3,
    updatedAt: "2025-10-11T16:55:00Z",
  },
  {
    id: "emberline-cloak",
    name: "Emberline Cloak",
    category: "Backwear",
    source: "Emberline Story Bundle",
    exclusiveToYear: null,
    finishVariants: 2,
    updatedAt: "2025-10-10T09:48:00Z",
  },
  {
    id: "sunder-gauntlets",
    name: "Sunder Gauntlets",
    category: "Gloves",
    source: "Warfront Spoils",
    exclusiveToYear: null,
    finishVariants: 5,
    updatedAt: "2025-10-09T21:10:00Z",
  },
  {
    id: "lumen-crown",
    name: "Lumen Crown",
    category: "Headgear",
    source: "Festival of Lights",
    exclusiveToYear: 2023,
    finishVariants: 4,
    updatedAt: "2025-10-08T14:33:00Z",
  },
  {
    id: "tideglass-staff",
    name: "Tideglass Staff",
    category: "Weapon",
    source: "Tidal Trials",
    exclusiveToYear: null,
    finishVariants: 3,
    updatedAt: "2025-10-07T11:05:00Z",
  },
  {
    id: "riftstep-greaves",
    name: "Riftstep Greaves",
    category: "Footwear",
    source: "Rift Siege",
    exclusiveToYear: null,
    finishVariants: 3,
    updatedAt: "2025-10-06T23:45:00Z",
  },
  {
    id: "obsidian-mesh-hood",
    name: "Obsidian Mesh Hood",
    category: "Headgear",
    source: "Shadow Market",
    exclusiveToYear: null,
    finishVariants: 2,
    updatedAt: "2025-10-05T07:12:00Z",
  },
  {
    id: "polaris-sash",
    name: "Polaris Sash",
    category: "Accessories",
    source: "Polaris Expedition",
    exclusiveToYear: 2022,
    finishVariants: 3,
    updatedAt: "2025-10-04T10:22:00Z",
  },
  {
    id: "gloomveil-wraps",
    name: "Gloomveil Wraps",
    category: "Gloves",
    source: "Gloom Bazaar",
    exclusiveToYear: null,
    finishVariants: 2,
    updatedAt: "2025-10-03T19:18:00Z",
  },
  {
    id: "starfall-mantle",
    name: "Starfall Mantle",
    category: "Backwear",
    source: "Starfall Archive",
    exclusiveToYear: null,
    finishVariants: 4,
    updatedAt: "2025-10-02T12:40:00Z",
  },
  {
    id: "cascade-veil",
    name: "Cascade Veil",
    category: "Headgear",
    source: "Riverborn Season",
    exclusiveToYear: 2021,
    finishVariants: 5,
    updatedAt: "2025-09-30T18:25:00Z",
  },
  {
    id: "mirage-treads",
    name: "Mirage Treads",
    category: "Footwear",
    source: "Mirage Arena",
    exclusiveToYear: null,
    finishVariants: 3,
    updatedAt: "2025-09-29T15:02:00Z",
  },
]

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

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
      <span className="text-sm text-foreground">{row.getValue("source")}</span>
    ),
  },
  {
    accessorKey: "exclusiveToYear",
    header: "Exclusive To",
    cell: ({ row }) => {
      const value = row.original.exclusiveToYear
      return value ? (
        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
          {value}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Shared pool</span>
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
    accessorKey: "finishVariants",
    header: "Finishes",
    cell: ({ row }) => (
      <span className="text-sm font-medium text-foreground">
        {row.getValue("finishVariants")}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Last synced",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {dateFormatter.format(new Date(row.original.updatedAt))}
      </span>
    ),
  },
]

export function CatalogPage() {
  const [categoryFilter, setCategoryFilter] = React.useState("all")

  const categoryOptions = React.useMemo(
    () => [
      "all",
      ...Array.from(new Set(cosmeticsCatalog.map((item) => item.category))),
    ],
    []
  )

  const filteredCosmetics = React.useMemo(() => {
    if (categoryFilter === "all") {
      return cosmeticsCatalog
    }

    return cosmeticsCatalog.filter(
      (item) => item.category === categoryFilter
    )
  }, [categoryFilter])

  return (
    <section className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Cosmetics Catalog
        </h1>
        <p className="text-sm text-muted-foreground">
          Reference the authoritative list of cosmetics, their finish
          eligibility, and acquisition sources.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {catalogHighlights.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold leading-none">
          Catalog maintenance checklist
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Based on `public.cosmetics` schema from the Supabase database.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          {upcomingTasks.map((task) => (
            <li
              key={task}
              className="rounded-md border border-dashed border-border px-4 py-3"
            >
              {task}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-none">
            Catalog entries
          </h2>
          <p className="text-xs text-muted-foreground">
            Snapshot of the tracked cosmetics and their finish readiness.
          </p>
        </div>

        <DataTable
          className="mt-6"
          columns={catalogColumns}
          data={filteredCosmetics}
          filterColumn="name"
          filterPlaceholder="Search cosmetics..."
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
                      Category
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
                          {option === "all" ? "All categories" : option}
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
      </div>
    </section>
  )
}

export default CatalogPage
