import { SupplierForm, type SupplierFormValues } from '@/features/suppliers/SupplierForm'
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers'
import { ResponsiveModal } from '@/components/shared/ResponsiveModal'
import type { Supplier } from '@/types'

interface SupplierModalProps {
  supplier?: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (supplier: Supplier) => void
}

export const SupplierModal = ({ supplier, open, onOpenChange, onSuccess }: SupplierModalProps) => {
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const isEditing = Boolean(supplier)
  const isPending = createSupplier.isPending || updateSupplier.isPending

  const handleSubmit = async (data: SupplierFormValues) => {
    const normalized = {
      ...data,
      phone: data.phone || null,
      address: data.address || null,
      ice: data.ice || null,
    }
    let result;
    if (isEditing && supplier) {
      result = await updateSupplier.mutateAsync({ id: supplier.id, ...normalized })
    } else {
      result = await createSupplier.mutateAsync(normalized)
    }
    onSuccess?.(result)
    onOpenChange(false)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
    >
      <SupplierForm
        defaultValues={supplier ?? undefined}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isLoading={isPending}
      />
    </ResponsiveModal>
  )
}
