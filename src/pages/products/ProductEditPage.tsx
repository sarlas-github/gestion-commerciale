import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductForm } from '@/features/products/ProductForm'
import { useProduct, useUpdateProduct } from '@/hooks/useProducts'
import { Skeleton } from '@/components/ui/skeleton'

export const ProductEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading } = useProduct(id ?? '')
  const updateProduct = useUpdateProduct()

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <p className="text-muted-foreground">Produit introuvable.</p>
    )
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Modifier le produit" />
      <div className="rounded-xl border bg-card p-6">
        <ProductForm
          initial={product}
          onSubmit={async data => {
            await updateProduct.mutateAsync({ id: id!, ...data })
            navigate('/products')
          }}
          onCancel={() => navigate('/products')}
          isLoading={updateProduct.isPending}
        />
      </div>
    </div>
  )
}
