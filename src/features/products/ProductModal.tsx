import { ProductForm, type ProductFormData } from '@/features/products/ProductForm'
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import { ResponsiveModal } from '@/components/shared/ResponsiveModal'
import type { Product, ProductWithStock } from '@/types'

interface ProductModalProps {
  product?: ProductWithStock | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (product: Product) => void
}

export const ProductModal = ({ product, open, onOpenChange, onSuccess }: ProductModalProps) => {
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const isEditing = Boolean(product)
  const isPending = createProduct.isPending || updateProduct.isPending

  const handleSubmit = async (data: ProductFormData) => {
    let result;
    if (isEditing && product) {
      result = await updateProduct.mutateAsync({ id: product.id, ...data })
    } else {
      result = await createProduct.mutateAsync(data)
    }
    onSuccess?.(result)
    onOpenChange(false)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Modifier le produit' : 'Nouveau produit'}
    >
      <ProductForm
        initial={product}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isLoading={isPending}
      />
    </ResponsiveModal>
  )
}
