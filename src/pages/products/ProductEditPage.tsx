import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductForm, type ProductFormData } from '@/features/products/ProductForm'
import { useProduct, useUpdateProduct } from '@/hooks/useProducts'
import { isUniqueNameError } from '@/lib/utils'
import type { UseFormSetError } from 'react-hook-form'

export const ProductEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading } = useProduct(id!)
  const updateProduct = useUpdateProduct()

  const handleSubmit = async (data: ProductFormData, setError: UseFormSetError<ProductFormData>) => {
    try {
      await updateProduct.mutateAsync({ id: id!, ...data })
      navigate('/products')
    } catch (err) {
      if (isUniqueNameError(err)) {
        setError('name', { message: 'Un produit avec ce nom existe déjà' })
      }
    }
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!product) return null

  const formId = "product-edit-form"

  return (
    <div className="space-y-6 max-w-lg pb-24 md:pb-0">
      <PageHeader
        title="Modifier le produit"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex gap-3">
            <Button variant="outline" onClick={() => navigate('/products')} disabled={updateProduct.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={updateProduct.isPending}>
              Enregistrer
            </Button>
          </div>
        }
      />
      <ProductForm
        id={formId}
        initial={product}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/products')}
        isLoading={updateProduct.isPending}
      />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t md:hidden flex justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="bg-card" onClick={() => navigate('/products')} disabled={updateProduct.isPending}>
          Annuler
        </Button>
        <Button type="submit" form={formId} disabled={updateProduct.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}





