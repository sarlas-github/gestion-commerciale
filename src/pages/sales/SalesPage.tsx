import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSales, useDeleteSale } from '@/hooks/useSales'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Sale } from '@/types'

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Payé</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const SalesPage = () => {
  const navigate = useNavigate()
  const { data: sales = [], isLoading } = useSales()
  const deleteSale = useDeleteSale()
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null)

  const now = new Date()
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()))
  const [filterStatus, setFilterStatus] = useState<string>('')

  const years = useMemo(() => {
    const set = new Set(sales.map(s => new Date(s.date).getFullYear()))
    set.add(now.getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [sales])

  const filtered = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.date)
      if (filterYear && d.getFullYear() !== Number(filterYear)) return false
      if (filterMonth && d.getMonth() + 1 !== Number(filterMonth)) return false
      if (filterStatus && s.status !== filterStatus) return false
      return true
    })
  }, [sales, filterYear, filterMonth, filterStatus])

  const columns = useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Référence',
        cell: ({ row }) => row.original.reference || <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'clients',
        header: 'Client',
        cell: ({ row }) => (row.original as Sale & { clients?: { name: string } }).clients?.name ?? '—',
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: 'created_at',
        header: 'Créé le',
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.total)}</span>,
      },
      {
        accessorKey: 'paid',
        header: 'Payé',
        cell: ({ row }) => formatCurrency(row.original.paid),
      },
      {
        accessorKey: 'remaining',
        header: 'Reste',
        cell: ({ row }) => (
          <span className={row.original.remaining > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
            {formatCurrency(row.original.remaining)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Modifier"
              onClick={() => navigate(`/sales/${row.original.id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Supprimer"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes"
        actions={
          <Button onClick={() => navigate('/sales/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle vente
          </Button>
        }
      />

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
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="unpaid">Impayé</option>
          <option value="partial">Partiel</option>
          <option value="paid">Payé</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par client..."
        exportFileName="ventes"
        defaultSorting={[{ id: 'created_at', desc: true }]}
        exportMapper={s => ({
          Client: (s as Sale & { clients?: { name: string } }).clients?.name ?? '',
          Date: formatDate(s.date),
          Total: s.total,
          Payé: s.paid,
          Reste: s.remaining,
          Statut: s.status === 'paid' ? 'Payé' : s.status === 'partial' ? 'Partiel' : 'Impayé',
        })}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer la vente"
        description="Supprimer cette vente ? Le stock sera restauré. Cette action est irréversible."
        onConfirm={() => {
          if (deleteTarget) {
            deleteSale.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
          }
        }}
        loading={deleteSale.isPending}
      />
    </div>
  )
}
