import { useState, useEffect, useRef, type ReactNode } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type FilterFn,
  flexRender,
} from '@tanstack/react-table'
import ExcelJS from 'exceljs'
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Download, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { DEFAULT_PAGE_SIZE } from '@/lib/utils'
import { useCompany } from '@/hooks/useCompany'

const STATUS_LABELS: Record<string, string> = {
  paid: 'payé',
  unpaid: 'impayé',
  partial: 'partiel',
  cancelled: 'annulé',
  ok: 'en stock',
  rupture: 'rupture',
  faible: 'faible',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowGlobalFilter: FilterFn<any> = (row, _columnId, filterValue) => {
  const search = String(filterValue).toLowerCase()
  const check = (val: unknown): boolean => {
    if (val == null) return false
    if (typeof val === 'object') return Object.values(val as Record<string, unknown>).some(check)
    const str = String(val).toLowerCase()
    if (str.includes(search)) return true
    const label = STATUS_LABELS[str]
    return label ? label.includes(search) : false
  }
  return check(row.original)
}
rowGlobalFilter.autoRemove = (val: unknown) => !val

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  exportFileName?: string
  exportMapper?: (row: TData) => Record<string, unknown>
  defaultSorting?: SortingState
  hideExport?: boolean
  onExportPdf?: () => void
  footer?: ReactNode
  autoPageSize?: boolean
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Rechercher...',
  exportFileName = 'export',
  exportMapper,
  defaultSorting = [],
  hideExport = false,
  onExportPdf,
  footer,
  autoPageSize = true,
}: DataTableProps<TData>) {
  const { data: company } = useCompany()
  const [sorting, setSorting] = useState<SortingState>(defaultSorting)
  const [globalFilter, setGlobalFilter] = useState('')

  const tableWrapperRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const mobileCardsRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentPageSizeRef = useRef<number>(DEFAULT_PAGE_SIZE)

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: rowGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    enableSortingRemoval: true,
  })

  // Keeps a stable ref to the table instance so the resize effect doesn't
  // need to re-subscribe every render (table is recreated on each render).
  const tableInstanceRef = useRef(table)
  tableInstanceRef.current = table

  // Track data length to re-trigger autoPageSize when data loads or changes
  const dataLenRef = useRef(data.length)
  dataLenRef.current = data.length

  useEffect(() => {
    if (!autoPageSize) return

    const recalc = () => {
      const mainEl = document.getElementById('main-scroll')
      if (!mainEl) return

      const isSmall = window.innerWidth < 640
      const mainBottom = mainEl.getBoundingClientRect().bottom
      const pagH = paginationRef.current?.offsetHeight ?? 40

      let refTop: number
      let rowH: number
      // Post-row constants — only what comes AFTER the rows in the DOM:
      //   space-y-4 gap(16) + card bottom p-4(16) + main bottom p-4(16) = 48
      //   + container bottom border(1) on desktop = 49
      let postOverhead: number

      if (isSmall) {
        const el = mobileCardsRef.current
        if (!el) return
        refTop = el.getBoundingClientRect().top
        // Measure an actual mobile card if possible
        const firstCard = el.querySelector(':scope > div')
        rowH = firstCard ? firstCard.getBoundingClientRect().height + 12 : 160 // 12 = space-y-3 gap
        postOverhead = 48
      } else {
        const containerEl = tableContainerRef.current
        if (!containerEl) return
        // Measure from the tbody — automatically skips card padding,
        // search bar, gaps, alert banners, page header, thead, etc.
        const tbodyEl = containerEl.querySelector('tbody')
        if (!tbodyEl) return
        refTop = tbodyEl.getBoundingClientRect().top
        // Measure actual row height from the first data row in the DOM
        const firstRow = tbodyEl.querySelector('tr')
        rowH = firstRow ? firstRow.getBoundingClientRect().height : 37
        postOverhead = 49 // container border-bottom(1) + gap(16) + card(16) + main(16)
      }

      const rows = Math.max(5, Math.floor((mainBottom - refTop - pagH - postOverhead) / rowH))

      if (rows !== currentPageSizeRef.current) {
        currentPageSizeRef.current = rows
        tableInstanceRef.current.setPageSize(rows)
      }
    }

    recalc()
    // Delayed recalcs catch layout shifts (banners, etc.) that appear after data loads
    const t1 = setTimeout(recalc, 150)
    const t2 = setTimeout(recalc, 500)

    const onResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(recalc, 200)
    }

    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', onResize)
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    }
  // Re-run when data loads/changes or loading state changes — this ensures
  // recalc fires AFTER alert banners, filters, etc. render in the DOM.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPageSize, data.length, isLoading])

  const { pageIndex } = table.getState().pagination
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const mainEl = document.getElementById('main-scroll')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [pageIndex])

  const handleExport = async () => {
    const rows = table.getFilteredRowModel().rows
    const exportData = exportMapper
      ? rows.map(r => exportMapper(r.original))
      : rows.map(r => r.original as Record<string, unknown>)

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Données')

    const keys = exportData.length > 0 ? Object.keys(exportData[0]) : []
    const colCount = Math.max(keys.length, 1)

    const hexToArgb = (hex: string) =>
      `FF${hex.replace('#', '').toUpperCase().padStart(6, '0')}`
    const brandArgb = hexToArgb(company?.couleur_marque ?? '#1e40af')

    let logoEmbedded = false

    // ── En-tête entreprise ────────────────────────────────────────────────────
    if (company) {
      if (company.logo_url) {
        try {
          const resp = await fetch(company.logo_url)
          const buf = await resp.arrayBuffer()
          const urlPath = company.logo_url.split('?')[0].toLowerCase()
          let ext: 'png' | 'jpeg' | 'gif' = 'png'
          if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) ext = 'jpeg'
          else if (urlPath.endsWith('.gif')) ext = 'gif'
          else if (!urlPath.endsWith('.png')) throw new Error('format non supporté')
          const imgId = workbook.addImage({ buffer: buf, extension: ext })
          worksheet.addImage(imgId, {
            tl: { col: 0, row: 0 },
            ext: { width: 90, height: 64 },
            editAs: 'oneCell',
          })
          logoEmbedded = true
          worksheet.getColumn(1).width = 14
        } catch {
          // logo ignoré silencieusement
        }
      }

      const textStart = logoEmbedded ? 2 : 1
      const endCol = textStart - 1 + colCount

      // Ligne 1 — Nom entreprise
      const r1 = worksheet.addRow([])
      r1.height = 24
      const c1 = r1.getCell(textStart)
      c1.value = company.name
      c1.font = { bold: true, size: 15, color: { argb: brandArgb } }
      c1.alignment = { vertical: 'middle' }
      if (endCol > textStart) worksheet.mergeCells(r1.number, textStart, r1.number, endCol)

      // Ligne 2 — Infos légales
      const legal = [
        company.ice ? `ICE: ${company.ice}` : null,
        company.if_number ? `IF: ${company.if_number}` : null,
        company.rc ? `RC: ${company.rc}` : null,
        company.tp_number ? `TP: ${company.tp_number}` : null,
        company.rib ? `RIB: ${company.rib}` : null,
      ].filter(Boolean).join('   |   ')
      const r2 = worksheet.addRow([])
      r2.height = 20
      if (legal) {
        const c2 = r2.getCell(textStart)
        c2.value = legal
        c2.font = { size: 9, color: { argb: 'FF64748B' } }
        if (endCol > textStart) worksheet.mergeCells(r2.number, textStart, r2.number, endCol)
      }

      // Ligne 3 — Contact
      const contact = [
        company.address ?? null,
        company.phone ? `Tél: ${company.phone}` : null,
        company.email ?? null,
      ].filter(Boolean).join('   |   ')
      const r3 = worksheet.addRow([])
      r3.height = 20
      if (contact) {
        const c3 = r3.getCell(textStart)
        c3.value = contact
        c3.font = { size: 9, color: { argb: 'FF64748B' } }
        if (endCol > textStart) worksheet.mergeCells(r3.number, textStart, r3.number, endCol)
      }

      // Séparateur
      const sep = worksheet.addRow([])
      sep.height = 8
    }

    // ── En-têtes colonnes ─────────────────────────────────────────────────────
    if (keys.length > 0) {
      const headerRow = worksheet.addRow(keys)
      headerRow.height = 22
      headerRow.eachCell(cell => {
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandArgb } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })

      // ── Lignes de données ───────────────────────────────────────────────────
      exportData.forEach((rowData, idx) => {
        const dr = worksheet.addRow(keys.map(k => rowData[k]))
        dr.height = 18
        if (idx % 2 === 1) {
          dr.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
          })
        }
      })

      // Auto-largeur basée sur les données
      const dataStartCol = logoEmbedded ? 2 : 1
      keys.forEach((key, idx) => {
        const col = worksheet.getColumn(dataStartCol + idx)
        let maxLen = Math.max(key.length, 10)
        exportData.forEach(row => {
          const len = row[key] != null ? String(row[key]).length : 0
          if (len > maxLen) maxLen = len
        })
        col.width = Math.min(maxLen + 4, 45)
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFileName}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { pageSize } = table.getState().pagination
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

  const headerMap = new Map(
    table.getHeaderGroups()[0]?.headers.map(h => [h.id, h]) ?? []
  )

  return (
    <div ref={tableWrapperRef} className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
      {/* Recherche + Export */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-sm text-sm shadow-sm"
        />
        <div className="flex gap-2">
          {!hideExport && (
            <Button variant="outline" onClick={handleExport} className="shadow-sm">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
          )}
          {onExportPdf && (
            <Button variant="outline" onClick={onExportPdf} className="shadow-sm">
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Mobile: cards */}
      <div ref={mobileCardsRef} className="block sm:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Aucun résultat
          </div>
        ) : (
          table.getRowModel().rows.map(row => {
            const allCells = row.getVisibleCells()
            const actionsCells = allCells.filter(c => c.column.id === 'actions')
            const dataCells = allCells.filter(c => c.column.id !== 'actions')

            return (
              <div key={row.id} className="rounded-lg border bg-card p-4">
                {dataCells[0] && (
                  <div className="font-medium text-sm mb-3">
                    {flexRender(dataCells[0].column.columnDef.cell, dataCells[0].getContext())}
                  </div>
                )}
                <div className="space-y-1.5">
                  {dataCells.slice(1).map(cell => {
                    const header = headerMap.get(cell.column.id)
                    const headerLabel = header
                      ? flexRender(header.column.columnDef.header, header.getContext())
                      : null
                    return (
                      <div key={cell.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground shrink-0">{headerLabel}</span>
                        <span className="text-right">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {actionsCells.length > 0 && (
                  <div className="flex justify-end mt-3 pt-2 border-t">
                    {actionsCells.map(cell => (
                      <span key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Desktop: table */}
      <div ref={tableContainerRef} className="hidden sm:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map(header => (
                  <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 font-semibold hover:text-foreground transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
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
                <TableRow key={row.id} className="even:bg-muted/40 hover:bg-muted transition-colors cursor-default">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {footer && <TableFooter>{footer}</TableFooter>}
        </Table>
      </div>

      {/* Pagination */}
      <div ref={paginationRef} className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {filteredCount === 0
            ? 'Aucun résultat'
            : `Affichage ${start}–${end} sur ${filteredCount}`}
        </p>
        {pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1">
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
