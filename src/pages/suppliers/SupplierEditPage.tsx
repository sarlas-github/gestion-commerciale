import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SupplierForm, type SupplierFormValues } from '@/features/suppliers/SupplierForm'
import { useSupplier, useUpdateSupplier } from '@/hooks/useSuppliers'
import { isUniqueNameError } from '@/lib/utils'
import type { UseFormSetError } from 'react-hook-form'

export const SupplierEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: supplier, isLoading } = useSupplier(id!)
  const updateSupplier = useUpdateSupplier()

  const handleSubmit = async (values: SupplierFormValues, setError: UseFormSetError<SupplierFormValues>) => {
    try {
      await updateSupplier.mutateAsync({ id: id!, ...values })
      navigate('/suppliers')
    } catch (err) {
      if (isUniqueNameError(err)) {
        setError('name', { message: 'Un fournisseur avec ce nom existe déjà' })
      }
    }
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!supplier) return null

  const formId = "supplier-edit-form"

  return (
    <div className="space-y-6 max-w-lg pb-24 md:pb-0">
      <PageHeader
        title="Modifier le fournisseur"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/suppliers')} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex gap-3">
            <Button variant="outline" onClick={() => navigate('/suppliers')} disabled={updateSupplier.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={updateSupplier.isPending}>
              Enregistrer
            </Button>
          </div>
        }
      />
      <SupplierForm
        id={formId}
        defaultValues={supplier}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/suppliers')}
        isLoading={updateSupplier.isPending}
      />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t md:hidden flex justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="bg-card" onClick={() => navigate('/suppliers')} disabled={updateSupplier.isPending}>
          Annuler
        </Button>
        <Button type="submit" form={formId} disabled={updateSupplier.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}





