import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
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
    await updateSupplier.mutateAsync({
      id: id!,
      name: values.name,
      phone: values.phone || null,
      address: values.address || null,
      ice: values.ice || null,
    })
    navigate(`/suppliers/${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!supplier) {
    return <div className="text-center text-muted-foreground py-20">Fournisseur introuvable.</div>
  }

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title={`Modifier — ${supplier.name}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(`/suppliers/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />

      <div className="rounded-lg border bg-card p-6">
        <SupplierForm
          defaultValues={supplier}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/suppliers/${id}`)}
          isLoading={updateSupplier.isPending}
        />
      </div>
    </div>
  )
}
