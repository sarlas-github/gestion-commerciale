import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Link2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PurchaseQuickViewModal } from '@/features/purchases/PurchaseQuickViewModal'
import { useStockMovements, type StockMovementRow } from '@/hooks/useStockMovements'
import { formatDate } from '@/lib/utils'

const TYPE_CONFIG = {
  in:     { label: 'IN',     className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  out:    { label: 'OUT',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  adjust: { label: 'ADJUST', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
} as const

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const StockMovementsPage = () => {
  const navigate = useNavigate()
  const { data: movements = [], isLoading } = useStockMovements()

  const now = new Date()
  const [typeFilter, setTypeFilter] = useState('all')
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  const [purchaseModalId, setPurchaseModalId] = useState<string | null>(null)

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i))

  const filtered = useMemo(
    () =>
      movements.filter(m => {
        if (typeFilter !== 'all' && m.type !== typeFilter) return false
        const d = new Date(m.date)
        if (month !== '0' && String(d.getMonth() + 1) !== month) return false
        if (String(d.getFullYear()) !== year) return false
        return true
      }),
    [movements, typeFilter, month, year]
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
        const cfg = TYPE_CONFIG[row.original.type]
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg?.className}`}>
            {cfg?.label ?? row.original.type.toUpperCase()}
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
          } else {
            navigate(`/sales/${reference_id}`)
          }
        }

        return (
          <button
            onClick={handleClick}
            className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
          >
            {label}
            <Link2 className="h-3 w-3 shrink-0" />
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
  ]

  return (
    <div>
      <PageHeader title="Mouvements stock" />

      {/* Sélecteurs période + filtre type */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Année */}
        <Select value={year} onValueChange={v => setYear(v ?? year)}>
          <SelectTrigger size="sm" className="w-24">
            <span className="flex-1 text-left">{year}</span>
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mois */}
        <Select value={month} onValueChange={v => setMonth(v ?? month)}>
          <SelectTrigger size="sm" className="w-40">
            <span className="flex-1 text-left">
              {month === '0' ? 'Tous les mois' : MONTHS[Number(month) - 1]}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Tous les mois</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre Type */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground">Type :</span>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v ?? 'all')}>
            <SelectTrigger size="sm" className="w-40">
              <span className="flex-1 text-left">
                {typeFilter === 'all' ? 'Tous les types' : typeFilter === 'in' ? 'IN 🟢' : typeFilter === 'out' ? 'OUT 🔴' : 'ADJUST 🔵'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="in">IN 🟢</SelectItem>
              <SelectItem value="out">OUT 🔴</SelectItem>
              <SelectItem value="adjust">ADJUST 🔵</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        searchPlaceholder="Rechercher un produit..."
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
      />

      <PurchaseQuickViewModal
        purchaseId={purchaseModalId}
        open={purchaseModalId !== null}
        onOpenChange={open => { if (!open) setPurchaseModalId(null) }}
      />
    </div>
  )
}
