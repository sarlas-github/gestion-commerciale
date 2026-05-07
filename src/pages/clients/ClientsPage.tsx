import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Trash2, Plus, ChevronDown, Check, AlertTriangle } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useClients, useDeleteClient, useUnpaidClientsCount, type ClientWithStats } from '@/hooks/useClients'
import { formatCurrency, formatPhone, cn } from '@/lib/utils'
import { usePageAction } from '@/contexts/PageContext'

const STATUS_OPTIONS = [
  { value: 'unpaid',  label: 'Impayé',  emoji: '🔴', badge: 'bg-red-100 text-red-800'    },
  { value: 'partial', label: 'Partiel', emoji: '🟡', badge: 'bg-orange-100 text-orange-800' },
  { value: 'ok',      label: 'OK',      emoji: '🟢', badge: 'bg-green-100 text-green-800' },
] as const

const StatusBadge = ({ status }: { status: 'ok' | 'partial' | 'unpaid' }) => {
  if (status === 'ok')      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 OK</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

export const ClientsPage = () => {
  const navigate = useNavigate()
  const { data: clients = [], isLoading } = useClients()
  const deleteClient = useDeleteClient()
  const { data: alertCount = 0 } = useUnpaidClientsCount()

  const [deleteTarget, setDeleteTarget] = useState<ClientWithStats | null>(null)
  const [filterStatuses, setFilterStatuses] = useState<string[]>([])

  const toggleStatus = (v: string) =>
    setFilterStatuses(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v])

  const ALERT_STATUSES = ['unpaid', 'partial']
  const isAlertFilterActive =
    ALERT_STATUSES.every(v => filterStatuses.includes(v)) && filterStatuses.length === ALERT_STATUSES.length

  const handleFilterAlerts = () =>
    setFilterStatuses(isAlertFilterActive ? [] : ALERT_STATUSES)



  const filtered = useMemo(
    () => filterStatuses.length === 0
      ? clients
      : clients.filter(c => filterStatuses.includes(c.paymentStatus)),
    [clients, filterStatuses]
  )

  usePageAction(
    <Button onClick={() => navigate('/clients/new')}>
      <Plus className="mr-1.5 h-4 w-4" />
      <span className="sm:hidden">Client</span>
      <span className="hidden sm:inline">Nouveau client</span>
    </Button>
  )

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
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir la fiche"
              onClick={() => navigate(`/clients/${row.original.id}`)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier"
              onClick={() => navigate(`/clients/${row.original.id}/edit`)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
              title="Supprimer" onClick={() => setDeleteTarget(row.original)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}
      />

      {alertCount > 0 && (
        <button
          onClick={handleFilterAlerts}
          className={cn(
            'w-full text-left rounded-lg border px-3 py-2.5 text-sm font-medium',
            'flex items-center gap-2.5 transition-all duration-150 group',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-1',
            isAlertFilterActive
              ? 'bg-red-100 border-red-400 text-red-900'
              : 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100 hover:border-red-300'
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <span className="flex-1">
            {alertCount} client{alertCount > 1 ? 's' : ''} avec des impayés
          </span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium shrink-0 transition-colors',
            isAlertFilterActive
              ? 'bg-red-700 text-white'
              : 'bg-red-100 text-red-600 group-hover:bg-red-200'
          )}>
            {isAlertFilterActive ? '✓ Filtré' : 'Filtrer'}
          </span>
        </button>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        {/* Mobile — Filter Chips */}
        <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Label masqué sur mobile */}
          <span className="text-sm text-muted-foreground shrink-0 hidden sm:inline">Statut :</span>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => toggleStatus(s.value)}
              className={cn(
                'h-8 px-3 rounded-full text-sm font-medium border-2 shrink-0 transition-all flex items-center gap-1.5',
                s.badge,
                filterStatuses.includes(s.value)
                  ? 'border-current'
                  : 'border-transparent opacity-55 hover:opacity-80'
              )}
            >
              {s.emoji}
              {s.label}
            </button>
          ))}
        </div>

        {/* Desktop — Popover multi-select */}
        <div className="hidden sm:flex items-center gap-2 sm:ml-auto">
          <span className="text-sm text-muted-foreground">Statut :</span>
          <Popover>
            <PopoverTrigger className="h-9 min-w-[140px] rounded-md border border-input bg-card pl-3 pr-2.5 py-1.5 text-sm flex items-center justify-between gap-2 shadow-sm hover:bg-accent">
              <span>
                {filterStatuses.length === 0
                  ? 'Tous les statuts'
                  : filterStatuses.length === 1
                    ? STATUS_OPTIONS.find(s => s.value === filterStatuses[0])?.label
                    : `${filterStatuses.length} statuts`}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1.5">
              {/* Ligne "Tout" */}
              <button
                onClick={() =>
                  filterStatuses.length === STATUS_OPTIONS.length
                    ? setFilterStatuses([])
                    : setFilterStatuses(STATUS_OPTIONS.map(s => s.value) as unknown as string[])
                }
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent border-b border-border mb-1 pb-2"
              >
                <div className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                  filterStatuses.length === STATUS_OPTIONS.length
                    ? 'bg-primary border-primary'
                    : filterStatuses.length > 0 ? 'border-primary' : 'border-input'
                )}>
                  {filterStatuses.length === STATUS_OPTIONS.length && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                  {filterStatuses.length > 0 && filterStatuses.length < STATUS_OPTIONS.length && (
                    <span className="h-0.5 w-2.5 bg-primary rounded-full" />
                  )}
                </div>
                <span className="text-muted-foreground">Tout sélectionner</span>
              </button>

              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => toggleStatus(s.value)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <div className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                    filterStatuses.includes(s.value) ? 'bg-primary border-primary' : 'border-input'
                  )}>
                    {filterStatuses.includes(s.value) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  {s.emoji}
                  <span className="flex-1 text-left">{s.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
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
    </div>
  )
}
