import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SupplierForm, type SupplierFormValues } from '@/features/suppliers/SupplierForm'
import { useCreateSupplier } from '@/hooks/useSuppliers'

export const SupplierNewPage = () => {
  const navigate = useNavigate()
  const createSupplier = useCreateSupplier()

  const handleSubmit = async (values: SupplierFormValues) => {
    await createSupplier.mutateAsync({
      ...values,
      phone: values.phone || null,
      address: values.address || null,
      ice: values.ice || null,
    })
    navigate('/suppliers')
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
