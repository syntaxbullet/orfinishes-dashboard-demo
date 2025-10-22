import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as TableInstance,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  className?: string
  filterColumn?: string
  filterPlaceholder?: string
  renderToolbar?: (table: TableInstance<TData>) => React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  filterColumn,
  filterPlaceholder = "Filter...",
  renderToolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const filter = filterColumn ? table.getColumn(filterColumn) : null
  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const paginationRange = React.useMemo<(number | "ellipsis")[]>(() => {
    if (pageCount <= 1) {
      return []
    }

    const siblingCount = 1
    const totalPageNumbers = siblingCount * 2 + 3

    if (pageCount <= totalPageNumbers) {
      return Array.from({ length: pageCount }, (_, index) => index)
    }

    const leftSiblingIndex = Math.max(pageIndex - siblingCount, 1)
    const rightSiblingIndex = Math.min(
      pageIndex + siblingCount,
      pageCount - 2
    )

    const showLeftEllipsis = leftSiblingIndex > 1
    const showRightEllipsis = rightSiblingIndex < pageCount - 2

    const range: (number | "ellipsis")[] = [0]

    if (!showLeftEllipsis) {
      for (let index = 1; index < leftSiblingIndex; index++) {
        range.push(index)
      }
    } else {
      range.push("ellipsis")
    }

    for (let index = leftSiblingIndex; index <= rightSiblingIndex; index++) {
      range.push(index)
    }

    if (!showRightEllipsis) {
      for (let index = rightSiblingIndex + 1; index < pageCount - 1; index++) {
        range.push(index)
      }
    } else {
      range.push("ellipsis")
    }

    range.push(pageCount - 1)

    return range
  }, [pageCount, pageIndex])
  const canPrevious = table.getCanPreviousPage()
  const canNext = table.getCanNextPage()

  return (
    <div className={cn("space-y-4", className)}>
      {renderToolbar ? (
        renderToolbar(table)
      ) : filter ? (
        <Input
          value={(filter.getFilterValue() as string) ?? ""}
          onChange={(event) => filter.setFilterValue(event.target.value)}
          placeholder={filterPlaceholder}
          className="max-w-xs"
        />
      ) : null}

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        canSort ? "cursor-pointer select-none" : ""
                      )}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort ? (
                            sorted === "asc" ? (
                              <ArrowUp className="size-3.5 text-muted-foreground" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5 text-muted-foreground" />
                            ) : (
                              <ArrowUpDown className="size-3.5 text-muted-foreground" />
                            )
                          ) : null}
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {table.getRowModel().rows.length}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">
            {table.getFilteredRowModel().rows.length}
          </span>{" "}
          cosmetics
        </p>
        <Pagination className="mx-0 justify-center sm:ml-auto sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (canPrevious) {
                    table.previousPage()
                  }
                }}
                className={cn(!canPrevious && "pointer-events-none opacity-50")}
                aria-disabled={!canPrevious}
                tabIndex={canPrevious ? undefined : -1}
              />
            </PaginationItem>
            {paginationRange.map((item, index) =>
              item === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={pageIndex === item}
                    onClick={(event) => {
                      event.preventDefault()
                      table.setPageIndex(item)
                    }}
                  >
                    {item + 1}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (canNext) {
                    table.nextPage()
                  }
                }}
                className={cn(!canNext && "pointer-events-none opacity-50")}
                aria-disabled={!canNext}
                tabIndex={canNext ? undefined : -1}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
