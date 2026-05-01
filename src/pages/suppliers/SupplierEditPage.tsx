import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SupplierForm, type SupplierFormValues } from '@/features/suppliers/SupplierForm'
import { useSupplier, useUpdateSupplier } from '@/hooks/useSuppliers'

export const SupplierEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: supplier, isLoading } = useSupplier(id!)
  const updateSupplier = useUpdateSupplier()

  const handleSubmit = async (values: SupplierFormValues) => {
    await updateSupplier.mutateAsync({ id: id!, ...values })
    navigate('/suppliers')
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!supplier) return null

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Modifier le fournisseur"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <SupplierForm
        defaultValues={supplier}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/suppliers')}
        isLoading={updateSupplier.isPending}
      />
    </div>
  )
}
