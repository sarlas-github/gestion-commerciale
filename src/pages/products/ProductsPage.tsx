import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Package2, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StockAdjustModal } from '@/features/products/StockAdjustModal'
import { useProducts, useDeleteProduct } from '@/hooks/useProducts'
import type { ProductWithStock } from '@/types'
import { cn } from '@/lib/utils'

const STOCK_COLORS: Record<string, string> = {
  ok: 'text-green-600 font-medium',
  faible: 'text-orange-500 font-medium',
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

  const [adjustProduct, setAdjustProduct] = useState<ProductWithStock | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const deleteTarget = products.find(p => p.id === deleteId)

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
    <div>
      <PageHeader
        title="Produits"
        actions={
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nouveau produit
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchPlaceholder="Rechercher un produit..."
        exportFileName="produits"
        exportMapper={p => ({
          Nom: p.name,
          Type: TYPE_LABELS[p.type] ?? p.type,
          Pièces: p.pieces_count,
          Stock: p.stock?.quantity ?? 0,
          'Seuil alerte': p.stock_alert,
          Statut: p.stockStatus,
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
