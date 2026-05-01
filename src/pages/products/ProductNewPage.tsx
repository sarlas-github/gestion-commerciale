import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductForm, type ProductFormData } from '@/features/products/ProductForm'
import { useCreateProduct } from '@/hooks/useProducts'

export const ProductNewPage = () => {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()

  const handleSubmit = async (data: ProductFormData) => {
    await createProduct.mutateAsync(data)
    navigate('/products')
  }

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Nouveau produit"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <ProductForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/products')}
        isLoading={createProduct.isPending}
      />
    </div>
  )
}
