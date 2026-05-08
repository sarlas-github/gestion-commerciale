import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SupplierForm, type SupplierFormValues } from '@/features/suppliers/SupplierForm'
import { useCreateSupplier } from '@/hooks/useSuppliers'
import { isUniqueNameError } from '@/lib/utils'
import type { UseFormSetError } from 'react-hook-form'

export const SupplierNewPage = () => {
  const navigate = useNavigate()
  const createSupplier = useCreateSupplier()

  const handleSubmit = async (values: SupplierFormValues, setError: UseFormSetError<SupplierFormValues>) => {
    try {
      await createSupplier.mutateAsync({
        ...values,
        phone: values.phone || null,
        address: values.address || null,
        ice: values.ice || null,
      })
      navigate('/suppliers')
    } catch (err) {
      if (isUniqueNameError(err)) {
        setError('name', { message: 'Un fournisseur avec ce nom existe déjà' })
      }
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Nouveau fournisseur"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <SupplierForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/suppliers')}
        isLoading={createSupplier.isPending}
      />
    </div>
  )
}





