import { useState, useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Link2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { PurchaseQuickViewModal } from '@/features/purchases/PurchaseQuickViewModal'
import { SaleQuickViewModal } from '@/features/sales/SaleQuickViewModal'
import { useStockMovements, type StockMovementRow } from '@/hooks/useStockMovements'
import { useAvailableYears } from '@/hooks/useAvailableYears'
import { PeriodSelector } from '@/components/shared/PeriodSelector'
import { formatDate } from '@/lib/utils'

const TYPE_CONFIG = {
  in:     { label: 'IN',     className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  out:    { label: 'OUT',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
} as const

export const StockMovementsPage = () => {
  const now = new Date()
  const [typeFilter, setTypeFilter] = useState('all')
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  const { data: movements = [], isLoading } = useStockMovements(month, year)
  const { data: years = [now.getFullYear()] } = useAvailableYears('stock_movements')

  const [purchaseModalId, setPurchaseModalId] = useState<string | null>(null)
  const [saleModalId, setSaleModalId] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      movements.filter(m => {
        if (typeFilter !== 'all' && m.type !== typeFilter) return false
        return true
      }),
    [movements, typeFilter]
  )

  const columns: ColumnDef<StockMovementRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: 'product',
      header: 'Produit',
      accessorFn: row => row.products?.name ?? '',
      cell: ({ row }) => row.original.products?.name ?? '—',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type as 'in' | 'out'
        const cfg = TYPE_CONFIG[type]
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg?.className ?? 'bg-muted text-muted-foreground'}`}>
            {cfg?.label ?? type.toUpperCase()}
          </span>
        )
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Quantité',
      cell: ({ row }) => {
        const q = row.original.quantity
        return (
          <span className={`font-medium tabular-nums ${q >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {q >= 0 ? `+${q}` : q}
          </span>
        )
      },
    },
    {
      id: 'reference',
      header: 'Référence',
      accessorFn: row => row.refLabel ?? row.reference_type,
      cell: ({ row }) => {
        const { reference_type, reference_id, refLabel } = row.original

        if (reference_type === 'manual' || !reference_id) {
          return <span className="text-muted-foreground text-sm">Manuel</span>
        }

        const label = refLabel ?? (reference_type === 'purchase' ? 'Achat' : 'Vente')
        const handleClick = () => {
          if (reference_type === 'purchase') {
            setPurchaseModalId(reference_id)
          } else if (reference_type === 'sale') {
            setSaleModalId(reference_id)
          }
        }

        return (
          <button
            onClick={handleClick}
            className="flex items-center gap-1 text-primary hover:underline text-sm"
          >
            <Link2 className="h-3.5 w-3.5" />
            {label}
          </button>
        )
      },
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.note ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Créé le',
      cell: ({ row }) => formatDate(row.original.created_at),
    },
  ]

  return (
    <div>
      <PageHeader title="Mouvements stock" />

      {/* Sélecteurs période + filtre type */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <PeriodSelector
          month={month}
          year={year}
          availableYears={years}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />

        {/* Filtre Type */}
        <div className="sm:ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">Type :</span>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v ?? 'all')}>
            <SelectTrigger size="sm" className="w-40">
              <span className="flex-1 text-left">
                {typeFilter === 'all' ? 'Tous les types' : typeFilter === 'in' ? 'IN 🟢' : 'OUT 🔴'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="in">IN 🟢</SelectItem>
              <SelectItem value="out">OUT 🔴</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        exportFileName="mouvements-stock"
        exportMapper={row => ({
          Date: formatDate(row.date),
          Produit: row.products?.name ?? '',
          Type: row.type.toUpperCase(),
          Quantité: row.quantity,
          Référence:
            row.reference_type === 'manual'
              ? 'Manuel'
              : row.refLabel ?? (row.reference_type === 'purchase' ? 'Achat' : 'Vente'),
          Note: row.note ?? '',
        })}
        defaultSorting={[{ id: 'date', desc: true }]}
      />

      <PurchaseQuickViewModal
        purchaseId={purchaseModalId}
        open={purchaseModalId !== null}
        onOpenChange={open => { if (!open) setPurchaseModalId(null) }}
      />

      <SaleQuickViewModal
        saleId={saleModalId}
        open={saleModalId !== null}
        onOpenChange={open => { if (!open) setSaleModalId(null) }}
      />
    </div>
  )
}





