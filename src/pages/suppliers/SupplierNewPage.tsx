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

  const formId = "supplier-new-form"

  return (
    <div className="space-y-6 max-w-lg pb-24 md:pb-0">
      <PageHeader
        title="Nouveau fournisseur"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/suppliers')} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex gap-3">
            <Button variant="outline" onClick={() => navigate('/suppliers')} disabled={createSupplier.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={createSupplier.isPending}>
              Enregistrer
            </Button>
          </div>
        }
      />
      <SupplierForm
        id={formId}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/suppliers')}
        isLoading={createSupplier.isPending}
      />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t md:hidden flex justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="bg-card" onClick={() => navigate('/suppliers')} disabled={createSupplier.isPending}>
          Annuler
        </Button>
        <Button type="submit" form={formId} disabled={createSupplier.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}





