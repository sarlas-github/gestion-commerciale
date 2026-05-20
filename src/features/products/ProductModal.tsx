import { ProductForm, type ProductFormData } from '@/features/products/ProductForm'
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import { ResponsiveModal } from '@/components/shared/ResponsiveModal'
import { isUniqueNameError } from '@/lib/utils'
import type { ProductWithStock } from '@/types'
import type { UseFormSetError } from 'react-hook-form'

interface ProductModalProps {
  product?: ProductWithStock | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (product: ProductWithStock) => void
  defaultNature?: 'revente' | 'matiere_premiere' | 'produit_fini'
  isProduction?: boolean
}

export const ProductModal = ({ product, open, onOpenChange, onSuccess, defaultNature, isProduction }: ProductModalProps) => {
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const isEditing = Boolean(product)
  const isPending = createProduct.isPending || updateProduct.isPending

  const handleSubmit = async (data: ProductFormData, setError: UseFormSetError<ProductFormData>) => {
    try {
      let result;
      if (isEditing && product) {
        result = await updateProduct.mutateAsync({ id: product.id, ...data })
      } else {
        result = await createProduct.mutateAsync(data)
      }
      onSuccess?.(result as ProductWithStock)
      onOpenChange(false)
    } catch (err) {
      if (isUniqueNameError(err)) {
        setError('name', { message: 'Un produit avec ce nom existe déjà' })
      }
    }
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
        isModal={true}
        initialNature={defaultNature}
        isProduction={isProduction}
        isNewProduct={!isEditing}
      />
    </ResponsiveModal>
  )
}
