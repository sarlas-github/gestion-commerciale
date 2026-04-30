import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePurchases, useDeletePurchase } from '@/hooks/usePurchases'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Purchase } from '@/types'

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Payé</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

export const PurchasesPage = () => {
  const navigate = useNavigate()
  const { data: purchases = [], isLoading } = usePurchases()
  const deletePurchase = useDeletePurchase()
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null)

  const columns = useMemo<ColumnDef<Purchase>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Référence',
        cell: ({ row }) => row.original.reference ? (
          <span
            className="text-primary underline underline-offset-2 cursor-pointer font-medium hover:text-primary/80"
            onClick={() => navigate(`/purchases/${row.original.id}/edit`)}
          >
            {row.original.reference}
          </span>
        ) : <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'suppliers',
        header: 'Fournisseur',
        cell: ({ row }) => {
          const supplier = (row.original as Purchase & { suppliers?: { id: string, name: string } }).suppliers
          return supplier ? (
            <span
              className="text-primary underline underline-offset-2 cursor-pointer font-medium hover:text-primary/80"
              onClick={() => navigate(`/suppliers/${supplier.id}`)}
            >
              {supplier.name}
            </span>
          ) : '—'
        },
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
              onClick={() => navigate(`/purchases/${row.original.id}/edit`)}
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
        title="Achats"
        actions={
          <Button onClick={() => navigate('/purchases/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel achat
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={purchases}
        isLoading={isLoading}
        searchPlaceholder="Rechercher par référence, fournisseur..."
        exportFileName="achats"
        defaultSorting={[{ id: 'created_at', desc: true }]}
        exportMapper={p => ({
          Référence: p.reference ?? '',
          Fournisseur: (p as Purchase & { suppliers?: { name: string } }).suppliers?.name ?? '',
          Date: formatDate(p.date),
          Total: p.total,
          Payé: p.paid,
          Reste: p.remaining,
          Statut: p.status === 'paid' ? 'Payé' : p.status === 'partial' ? 'Partiel' : 'Impayé',
        })}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer l'achat"
        description={`Supprimer l'achat ${deleteTarget?.reference ?? 'sans référence'} ? Cette action est irréversible.`}
        onConfirm={() => {
          if (deleteTarget) {
            deletePurchase.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
          }
        }}
        loading={deletePurchase.isPending}
      />
    </div>
  )
}
