import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Trash2, Plus } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClients, useDeleteClient, type ClientWithStats } from '@/hooks/useClients'
import { formatCurrency, formatPhone } from '@/lib/utils'
import { ClientModal } from '@/features/clients/ClientModal'
import type { Client } from '@/types'

const StatusBadge = ({ status }: { status: 'ok' | 'partial' | 'unpaid' }) => {
  if (status === 'ok') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 OK</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

export const ClientsPage = () => {
  const navigate = useNavigate()
  const { data: clients = [], isLoading } = useClients()
  const deleteClient = useDeleteClient()
  
  const [deleteTarget, setDeleteTarget] = useState<ClientWithStats | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const handleOpenModal = (client?: Client) => {
    setEditingClient(client || null)
    setIsModalOpen(true)
  }

  const handleCloseModal = (open: boolean) => {
    if (!open) {
      setIsModalOpen(false)
      setTimeout(() => setEditingClient(null), 200)
    }
  }

  const columns = useMemo<ColumnDef<ClientWithStats>[]>(
    () => [
      { accessorKey: 'name', header: 'Nom' },
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
              onClick={() => navigate(`/clients/${row.original.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Modifier"
              onClick={() => handleOpenModal(row.original)}
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
        title="Clients"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={clients}
        isLoading={isLoading}
        searchPlaceholder="Rechercher un client..."
        exportFileName="clients"
        exportMapper={c => ({
          Nom: c.name,
          Téléphone: formatPhone(c.phone),
          Adresse: c.address ?? '',
          ICE: c.ice ?? '',
          'Total dû': c.totalDu,
          Statut: c.paymentStatus === 'ok' ? 'OK' : c.paymentStatus === 'partial' ? 'Partiel' : 'Impayé',
        })}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer le client"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteClient.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) })
          }
        }}
        loading={deleteClient.isPending}
      />

      <ClientModal
        client={editingClient}
        open={isModalOpen}
        onOpenChange={handleCloseModal}
      />
    </div>
  )
}
