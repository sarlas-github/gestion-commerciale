import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductForm } from '@/features/products/ProductForm'
import { useCreateProduct } from '@/hooks/useProducts'

export const ProductNewPage = () => {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()

  return (
    <div className="max-w-lg">
      <PageHeader title="Nouveau produit" />
      <div className="rounded-xl border bg-card p-6">
        <ProductForm
          onSubmit={async data => {
            await createProduct.mutateAsync(data)
            navigate('/products')
          }}
          onCancel={() => navigate('/products')}
          isLoading={createProduct.isPending}
        />
      </div>
    </div>
  )
}
