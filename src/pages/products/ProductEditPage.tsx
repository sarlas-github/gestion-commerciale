import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductForm, type ProductFormData } from '@/features/products/ProductForm'
import { useProduct, useUpdateProduct } from '@/hooks/useProducts'

export const ProductEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading } = useProduct(id!)
  const updateProduct = useUpdateProduct()

  const handleSubmit = async (data: ProductFormData) => {
    await updateProduct.mutateAsync({ id: id!, ...data })
    navigate('/products')
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!product) return null

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Modifier le produit"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <ProductForm
        initial={product}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/products')}
        isLoading={updateProduct.isPending}
      />
    </div>
  )
}
