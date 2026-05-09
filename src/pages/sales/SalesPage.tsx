import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Link2, FileText, ChevronDown, Check, Ban } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSales, useCancelSale } from '@/hooks/useSales'
import { SaleQuickViewModal } from '@/features/sales/SaleQuickViewModal'
import { usePageAction } from '@/contexts/PageContext'

import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Sale } from '@/types'

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'paid')    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Payé</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  if (status === 'cancelled') return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">⛔ Annulé</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

const STATUS_OPTIONS = [
  { value: 'unpaid',  label: 'Impayé',  emoji: '🔴', badge: 'bg-red-100 text-red-800'    },
  { value: 'partial', label: 'Partiel', emoji: '🟡', badge: 'bg-orange-100 text-orange-800' },
  { value: 'paid',    label: 'Payé',    emoji: '🟢', badge: 'bg-green-100 text-green-800' },
  { value: 'cancelled',  label: 'Annulé',  emoji: '⛔', badge: 'bg-gray-100 text-gray-500'   },
] as const

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const SalesPage = () => {
  const navigate = useNavigate()
  const { data: sales = [], isLoading } = useSales()
  const cancelSale = useCancelSale()
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  usePageAction(
    <Button onClick={() => navigate('/sales/new')}>
      <Plus className="mr-1.5 h-4 w-4" />
      <span className="sm:hidden">Vente</span>
      <span className="hidden sm:inline">Nouvelle vente</span>
    </Button>
  )


  const handleQuickView = (id: string) => {
    setSelectedSaleId(id)
    setIsModalOpen(true)
  }

  const now = new Date()
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth() + 1))
  const [filterYear, setFilterYear] = useState<string>(String(now.getFullYear()))
  const [filterStatuses, setFilterStatuses] = useState<string[]>([])
  const toggleStatus = (v: string) =>
    setFilterStatuses(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v])

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
      if (filterStatuses.length > 0 && !filterStatuses.includes(s.status)) return false
      return true
    })
  }, [sales, filterYear, filterMonth, filterStatuses])

  const hasInvoice = (sale: Sale) =>
    (sale as Sale & { documents?: { type: string }[] }).documents?.some(d => d.type === 'invoice') ?? false

  const columns = useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Référence',
        cell: ({ row }) => row.original.reference ? (
          <button
            className="flex items-center gap-1 text-primary hover:underline text-sm font-medium"
            onClick={() => handleQuickView(row.original.id)}
          >
            <Link2 className="h-3.5 w-3.5" />
            {row.original.reference}
          </button>
        ) : <span className="text-muted-foreground">—</span>,
      },
      {
        accessorKey: 'clients',
        header: 'Client',
        cell: ({ row }) => {
          const client = (row.original as Sale & { clients?: { id: string, name: string } }).clients
          return client ? (
            <button
              className="flex items-center gap-1 text-primary hover:underline text-sm"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <Link2 className="h-3.5 w-3.5" />
              {client.name}
            </button>
          ) : '—'
        },
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: 'updated_at',
        header: 'Modifié le',
        cell: ({ row }) => formatDate(row.original.updated_at),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => (
          <span className={cn('font-medium', row.original.status === 'cancelled' && 'line-through text-muted-foreground')}>
            {formatCurrency(row.original.total)}
          </span>
        ),
      },
      {
        accessorKey: 'paid',
        header: 'Payé',
        cell: ({ row }) => (
          <span className={cn(row.original.status === 'cancelled' && 'text-muted-foreground line-through')}>
            {formatCurrency(row.original.paid)}
          </span>
        ),
      },
      {
        accessorKey: 'remaining',
        header: 'Reste',
        cell: ({ row }) => (
          <span className={row.original.status === 'cancelled'
            ? 'text-muted-foreground line-through'
            : row.original.remaining > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'
          }>
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
        cell: ({ row }) => {
          const isCancelled = row.original.status === 'cancelled'
          const hasPaid = row.original.paid > 0
          const canCancel = !isCancelled && !hasPaid
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={hasInvoice(row.original) ? 'Voir facture' : 'Aperçu facture'}
                onClick={() => navigate(`/sales/${row.original.id}/invoice`)}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={isCancelled ? 'Modification impossible (annulé)' : 'Modifier'}
                disabled={isCancelled}
                onClick={() => navigate(`/sales/${row.original.id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                title={
                  isCancelled ? 'Déjà annulé'
                  : hasPaid ? 'Annulation impossible : un paiement a été enregistré'
                  : 'Annuler cette vente'
                }
                disabled={!canCancel}
                onClick={() => setCancelTarget(row.original)}
              >
                <Ban className="h-4 w-4" />
              </Button>
            </div>
          )
        },
      },
    ],
    [navigate]
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Ventes" subtitle={`${sales.length} vente${sales.length !== 1 ? 's' : ''}`} />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <select
          className="h-9 rounded-md border border-input bg-card pl-3 pr-8 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer shadow-sm appearance-none"
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-card pl-3 pr-8 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer shadow-sm appearance-none"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        >
          <option value="">Tous les mois</option>
          {MONTHS_FR.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        {/* Mobile — Filter Chips */}
        <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <PopoverContent align="end" className="w-48 p-1.5">
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
                  {filterStatuses.length === STATUS_OPTIONS.length && <Check className="h-3 w-3 text-primary-foreground" />}
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
                  {s.label}
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
        exportFileName="ventes"
        defaultSorting={[{ id: 'date', desc: true }]}
        exportMapper={s => ({
          Client: (s as Sale & { clients?: { name: string } }).clients?.name ?? '',
          Date: formatDate(s.date),
          Total: s.total,
          Payé: s.paid,
          Reste: s.remaining,
          Statut: s.status === 'paid' ? 'Payé' : s.status === 'partial' ? 'Partiel' : s.status === 'cancelled' ? 'Annulé' : 'Impayé',
        })}
      />

      {/* Dialog annulation */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={open => { if (!open) setCancelTarget(null) }}
        title="Annuler la vente"
        description={
          `Annuler la vente ${cancelTarget?.reference ?? 'sans référence'} ?\n\n` +
          `Le stock sera restauré (quantités réajoutées). Cette opération est irréversible.`
        }
        onConfirm={() => {
          if (cancelTarget) {
            cancelSale.mutate(cancelTarget.id, { onSettled: () => setCancelTarget(null) })
          }
        }}
        loading={cancelSale.isPending}
      />

      <SaleQuickViewModal
        saleId={selectedSaleId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />


    </div>
  )
}
