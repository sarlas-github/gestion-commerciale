import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Package2, Trash2, Plus, ChevronDown, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StockAdjustModal } from '@/features/products/StockAdjustModal'
import { useProducts, useDeleteProduct, useStockAlertCount } from '@/hooks/useProducts'
import type { ProductWithStock } from '@/types'
import { cn } from '@/lib/utils'
import { usePageAction } from '@/contexts/PageContext'

const STOCK_STATUS_OPTIONS = [
  { value: 'rupture', label: 'Rupture',  emoji: '🔴', badge: 'bg-red-100 text-red-800'    },
  { value: 'faible',  label: 'Faible',   emoji: '🟡', badge: 'bg-orange-100 text-orange-800' },
  { value: 'ok',      label: 'En stock', emoji: '🟢', badge: 'bg-green-100 text-green-800' },
] as const

const StockStatusBadge = ({ status }: { status: string }) => {
  if (status === 'ok')     return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 En stock</Badge>
  if (status === 'faible') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Faible</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Rupture</Badge>
}

const STOCK_COLORS: Record<string, string> = {
  ok:      'text-green-600 font-medium',
  faible:  'text-orange-500 font-medium',
  rupture: 'text-destructive font-medium',
}

const TYPE_LABELS: Record<string, string> = {
  individual: 'Individuel',
  pack: 'Pack',
}

export const ProductsPage = () => {
  const navigate = useNavigate()
  const { data: products = [], isLoading } = useProducts()
  const deleteProduct = useDeleteProduct()
  const { data: alertCount = 0 } = useStockAlertCount()

  const [adjustProduct, setAdjustProduct] = useState<ProductWithStock | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterStatuses, setFilterStatuses] = useState<string[]>([])

  const toggleStatus = (v: string) =>
    setFilterStatuses(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v])

  const ALERT_STATUSES = ['rupture', 'faible']
  const isAlertFilterActive =
    ALERT_STATUSES.every(v => filterStatuses.includes(v)) && filterStatuses.length === ALERT_STATUSES.length

  const handleFilterAlerts = () =>
    setFilterStatuses(isAlertFilterActive ? [] : ALERT_STATUSES)

  const deleteTarget = products.find(p => p.id === deleteId)

  const filtered = useMemo(
    () => filterStatuses.length === 0
      ? products
      : products.filter(p => filterStatuses.includes(p.stockStatus)),
    [products, filterStatuses]
  )

  usePageAction(
    <Button onClick={() => navigate('/products/new')}>
      <Plus className="mr-1.5 h-4 w-4" />
      <span className="sm:hidden">Produit</span>
      <span className="hidden sm:inline">Nouveau produit</span>
    </Button>
  )

  const columns: ColumnDef<ProductWithStock>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => TYPE_LABELS[row.original.type] ?? row.original.type,
    },
    {
      accessorKey: 'pieces_count',
      header: 'Pièces',
    },
    {
      id: 'stock',
      header: 'Stock',
      accessorFn: row => row.stock?.quantity ?? 0,
      cell: ({ row }) => {
        const qty = row.original.stock?.quantity ?? 0
        const status = row.original.stockStatus
        return (
          <span className={cn(STOCK_COLORS[status] ?? '')}>
            {qty}
          </span>
        )
      },
    },
    {
      accessorKey: 'stock_alert',
      header: 'Seuil',
    },
    {
      accessorKey: 'stockStatus',
      header: 'Statut',
      cell: ({ row }) => <StockStatusBadge status={row.original.stockStatus} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Modifier"
            onClick={() => navigate(`/products/${row.original.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Correction stock"
            onClick={() => setAdjustProduct(row.original)}
          >
            <Package2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Supprimer"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteId(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteProduct.mutateAsync(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Produits" subtitle={`${products.length} produit${products.length !== 1 ? 's' : ''}`} />

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
          <span className="flex-1 truncate">
            {alertCount} produit{alertCount > 1 ? 's' : ''} en alerte
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
          <span className="text-sm text-muted-foreground shrink-0 hidden sm:block">Statut :</span>
          {STOCK_STATUS_OPTIONS.map(s => (
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
          <span className="text-sm text-muted-foreground">Statut stock :</span>
          <Popover>
            <PopoverTrigger className="h-9 min-w-[140px] rounded-md border border-input bg-card pl-3 pr-2.5 py-1.5 text-sm flex items-center justify-between gap-2 shadow-sm hover:bg-accent">
              <span>
                {filterStatuses.length === 0
                  ? 'Tous les statuts'
                  : filterStatuses.length === 1
                    ? STOCK_STATUS_OPTIONS.find(s => s.value === filterStatuses[0])?.label
                    : `${filterStatuses.length} statuts`}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1.5">
              {/* Ligne "Tout" */}
              <button
                onClick={() =>
                  filterStatuses.length === STOCK_STATUS_OPTIONS.length
                    ? setFilterStatuses([])
                    : setFilterStatuses(STOCK_STATUS_OPTIONS.map(s => s.value) as unknown as string[])
                }
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent border-b border-border mb-1 pb-2"
              >
                <div className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                  filterStatuses.length === STOCK_STATUS_OPTIONS.length
                    ? 'bg-primary border-primary'
                    : filterStatuses.length > 0
                      ? 'border-primary'
                      : 'border-input'
                )}>
                  {filterStatuses.length === STOCK_STATUS_OPTIONS.length && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                  {filterStatuses.length > 0 && filterStatuses.length < STOCK_STATUS_OPTIONS.length && (
                    <span className="h-0.5 w-2.5 bg-primary rounded-full" />
                  )}
                </div>
                <span className="text-muted-foreground">Tout sélectionner</span>
              </button>

              {STOCK_STATUS_OPTIONS.map(s => (
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
        exportFileName="produits"
        exportMapper={p => ({
          Nom: p.name,
          Type: TYPE_LABELS[p.type] ?? p.type,
          Pièces: p.pieces_count,
          Stock: p.stock?.quantity ?? 0,
          'Seuil alerte': p.stock_alert,
          Statut: p.stockStatus === 'ok' ? 'En stock' : p.stockStatus === 'faible' ? 'Faible' : 'Rupture',
        })}
      />

      <StockAdjustModal
        product={adjustProduct}
        open={adjustProduct !== null}
        onOpenChange={open => { if (!open) setAdjustProduct(null) }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        title="Supprimer le produit"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name ?? ''}" ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleteProduct.isPending}
      />
    </div>
  )
}
