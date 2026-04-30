import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils'

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  exportFileName?: string
  exportMapper?: (row: TData) => Record<string, unknown>
  defaultSorting?: SortingState
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Rechercher...',
  exportFileName = 'export',
  exportMapper,
  defaultSorting = [],
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting)
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    enableSortingRemoval: true,
  })

  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows
    const exportData = exportMapper
      ? rows.map(r => exportMapper(r.original))
      : rows.map(r => r.original as Record<string, unknown>)
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Données')
    XLSX.writeFile(wb, `${exportFileName}.xlsx`)
  }

  const { pageIndex, pageSize } = table.getState().pagination
  const filteredCount = table.getFilteredRowModel().rows.length
  const start = filteredCount === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, filteredCount)
  const pageCount = table.getPageCount()

  const renderPageButtons = () => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => (
        <Button
          key={i}
          variant={pageIndex === i ? 'default' : 'outline'}
          size="icon-sm"
          onClick={() => table.setPageIndex(i)}
        >
          {i + 1}
        </Button>
      ))
    }
    const pages: (number | 'ellipsis')[] = [0]
    if (pageIndex > 2) pages.push('ellipsis')
    for (let i = Math.max(1, pageIndex - 1); i <= Math.min(pageCount - 2, pageIndex + 1); i++) {
      pages.push(i)
    }
    if (pageIndex < pageCount - 3) pages.push('ellipsis')
    pages.push(pageCount - 1)

    return pages.map((p, idx) =>
      p === 'ellipsis' ? (
        <span key={`e${idx}`} className="px-1 text-muted-foreground">…</span>
      ) : (
        <Button
          key={p}
          variant={pageIndex === p ? 'default' : 'outline'}
          size="icon-sm"
          onClick={() => table.setPageIndex(p as number)}
        >
          {(p as number) + 1}
        </Button>
      )
    )
  }

  return (
    <div className="space-y-4">
      {/* Recherche + Export */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Export Excel
        </Button>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun résultat
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredCount === 0
            ? 'Aucun résultat'
            : `Affichage ${start}-${end} sur ${filteredCount}`}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {renderPageButtons()}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
