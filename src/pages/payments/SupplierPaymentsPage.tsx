import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Link2 } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAllSupplierPayments, type SupplierPaymentRow } from '@/hooks/useSupplierPayments'
import { useAvailableYears } from '@/hooks/useAvailableYears'
import { PeriodSelector } from '@/components/shared/PeriodSelector'
import { PurchaseQuickViewModal } from '@/features/purchases/PurchaseQuickViewModal'
import { formatCurrency, formatDate } from '@/lib/utils'



export const SupplierPaymentsPage = () => {
  const navigate = useNavigate()
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1))
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()))

  const { data: payments = [], isLoading } = useAllSupplierPayments(filterMonth, filterYear)
  const { data: years = [now.getFullYear()] } = useAvailableYears('supplier_payments')

  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleQuickView = (id: string) => {
    setSelectedPurchaseId(id)
    setIsModalOpen(true)
  }

  const filtered = payments

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
      cell: ({ row }) => row.original.supplier_id ? (
        <button
          className="flex items-center gap-1 text-primary hover:underline text-sm"
          onClick={() => navigate(`/suppliers/${row.original.supplier_id}`)}
        >
          <Link2 className="h-3.5 w-3.5" />
          {row.original.supplier_name}
        </button>
      ) : row.original.supplier_name,
    },
    {
      id: 'reference',
      header: 'Achat réf.',
      cell: ({ row }) => (
        <button
          className="flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          onClick={() => handleQuickView(row.original.purchase_id)}
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
        <PeriodSelector
          month={filterMonth}
          year={filterYear}
          availableYears={years}
          onMonthChange={setFilterMonth}
          onYearChange={setFilterYear}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
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

      <PurchaseQuickViewModal
        purchaseId={selectedPurchaseId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  )
}





