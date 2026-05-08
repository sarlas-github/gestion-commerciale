import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductForm, type ProductFormData } from '@/features/products/ProductForm'
import { useCreateProduct } from '@/hooks/useProducts'
import { isUniqueNameError } from '@/lib/utils'
import type { UseFormSetError } from 'react-hook-form'

export const ProductNewPage = () => {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()

  const handleSubmit = async (data: ProductFormData, setError: UseFormSetError<ProductFormData>) => {
    try {
      await createProduct.mutateAsync(data)
      navigate('/products')
    } catch (err) {
      if (isUniqueNameError(err)) {
        setError('name', { message: 'Un produit avec ce nom existe déjà' })
      }
    }
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





