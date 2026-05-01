import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Trash2, Plus } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSuppliers, useDeleteSupplier, type SupplierWithStats } from '@/hooks/useSuppliers'
import { formatCurrency, formatPhone } from '@/lib/utils'

const StatusBadge = ({ status }: { status: 'ok' | 'partial' | 'unpaid' }) => {
  if (status === 'ok') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 OK</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

export const SuppliersPage = () => {
  const navigate = useNavigate()
  const { data: suppliers = [], isLoading } = useSuppliers()
  const deleteSupplier = useDeleteSupplier()

  const [deleteTarget, setDeleteTarget] = useState<SupplierWithStats | null>(null)

  const columns = useMemo<ColumnDef<SupplierWithStats>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nom',
      },
      {
        accessorKey: 'phone',
        header: 'Téléphone',
        cell: ({ row }) => formatPhone(row.original.phone) || '—',
      },
      {
        accessorKey: 'address',
        header: 'Adresse',
        cell: ({ row }) => row.original.address || '—',
      },
      {
        accessorKey: 'totalDu',
        header: 'Total dû',
        cell: ({ row }) => (
          <span className={row.original.totalDu > 0 ? 'font-medium text-red-600' : 'text-muted-foreground'}>
            {formatCurrency(row.original.totalDu)}
          </span>
        ),
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Statut',
        cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
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
              title="Voir la fiche"
              onClick={() => navigate(`/suppliers/${row.original.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Modifier"
              onClick={() => navigate(`/suppliers/${row.original.id}/edit`)}
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
        title="Fournisseurs"
        actions={
          <Button onClick={() => navigate('/suppliers/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau fournisseur
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        searchPlaceholder="Rechercher un fournisseur..."
        exportFileName="fournisseurs"
        exportMapper={s => ({
          Nom: s.name,
          Téléphone: formatPhone(s.phone),
          Adresse: s.address ?? '',
          ICE: s.ice ?? '',
          'Total dû': s.totalDu,
          Statut: s.paymentStatus === 'ok' ? 'OK' : s.paymentStatus === 'partial' ? 'Partiel' : 'Impayé',
        })}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer le fournisseur"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteSupplier.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
          }
        }}
        loading={deleteSupplier.isPending}
      />
    </div>
  )
}
