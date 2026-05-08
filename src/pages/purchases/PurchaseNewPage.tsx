import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { PurchaseForm, type PurchaseFormValues } from '@/features/purchases/PurchaseForm'
import { useCreatePurchase } from '@/hooks/usePurchases'

export const PurchaseNewPage = () => {
  const navigate = useNavigate()
  const createPurchase = useCreatePurchase()

  const handleSubmit = async (values: PurchaseFormValues) => {
    await createPurchase.mutateAsync({
      supplier_id: values.supplier_id,
      date: values.date,
      reference: values.reference ?? '',
      note: values.note ?? '',
      tva_rate: values.tva_rate ?? 0,
      items: values.items,
      payments: values.payments.map(p => ({
        date: p.date,
        amount: Number(p.amount),
        note: p.note ?? '',
      })),
    })
    navigate('/purchases')
  }

  const formId = "purchase-new-form"

  return (
    <div className="space-y-6 max-w-3xl pb-24 md:pb-0">
      <PageHeader
        title="Nouvel achat"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchases')} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex gap-3">
            <Button variant="outline" onClick={() => navigate('/purchases')} disabled={createPurchase.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={createPurchase.isPending}>
              Enregistrer
            </Button>
          </div>
        }
      />
      <PurchaseForm id={formId} onSubmit={handleSubmit} />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t md:hidden flex justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="bg-card" onClick={() => navigate('/purchases')} disabled={createPurchase.isPending}>
          Annuler
        </Button>
        <Button type="submit" form={formId} disabled={createPurchase.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}





