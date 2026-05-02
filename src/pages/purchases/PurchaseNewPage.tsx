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

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Nouvel achat"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/purchases')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <PurchaseForm onSubmit={handleSubmit} isLoading={createPurchase.isPending} />
    </div>
  )
}
