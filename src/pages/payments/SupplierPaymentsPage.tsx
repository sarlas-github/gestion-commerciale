import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Link2 } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAllSupplierPayments, type SupplierPaymentRow } from '@/hooks/useSupplierPayments'
import { formatCurrency, formatDate } from '@/lib/utils'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const SupplierPaymentsPage = () => {
  const navigate = useNavigate()
  const { data: payments = [], isLoading } = useAllSupplierPayments()

  const now = new Date()
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()))

  const years = useMemo(() => {
    const set = new Set(payments.map(p => new Date(p.date).getFullYear()))
    set.add(now.getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [payments])

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const d = new Date(p.date)
      if (filterYear && d.getFullYear() !== Number(filterYear)) return false
      if (filterMonth && d.getMonth() + 1 !== Number(filterMonth)) return false
      return true
    })
  }, [payments, filterYear, filterMonth])

  const total = filtered.reduce((s, p) => s + p.amount, 0)

  const columns = useMemo<ColumnDef<SupplierPaymentRow>[]>(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'supplier_name',
      header: 'Fournisseur',
    },
    {
      id: 'reference',
      header: 'Achat réf.',
      cell: ({ row }) => (
        <button
          className="flex items-center gap-1 text-primary hover:underline text-sm"
          onClick={() => navigate(`/purchases/${row.original.purchase_id}/edit`)}
        >
          <Link2 className="h-3.5 w-3.5" />
          {row.original.purchase_reference ?? 'Voir achat'}
        </button>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Montant',
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.amount)}</span>,
    },
    {
      accessorKey: 'methode_paiement',
      header: 'Méthode',
      cell: ({ row }) => row.original.methode_paiement || '—',
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ row }) => row.original.note || '—',
    },
  ], [navigate])

  return (
    <div className="space-y-6">
      <PageHeader title="Paiements fournisseurs" />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        >
          <option value="">Tous les mois</option>
          {MONTHS_FR.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par fournisseur, référence..."
        exportFileName="paiements-fournisseurs"
        exportMapper={p => ({
          Date: formatDate(p.date),
          Fournisseur: p.supplier_name,
          Référence: p.purchase_reference ?? '',
          Montant: p.amount,
          Méthode: p.methode_paiement ?? '',
          Note: p.note ?? '',
        })}
      />

      {filtered.length > 0 && (
        <div className="flex justify-end">
          <p className="text-sm font-medium">
            Total décaissé : <span className="font-bold text-red-600">{formatCurrency(total)}</span>
          </p>
        </div>
      )}
    </div>
  )
}
