import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { PurchaseForm, type PurchaseFormValues } from '@/features/purchases/PurchaseForm'
import { usePurchase, useUpdatePurchase } from '@/hooks/usePurchases'

export const PurchaseEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: purchase, isLoading } = usePurchase(id!)
  const updatePurchase = useUpdatePurchase()

  const handleSubmit = async (values: PurchaseFormValues) => {
    await updatePurchase.mutateAsync({
      id: id!,
      payments: values.payments.map(p => ({
        date: p.date,
        amount: Number(p.amount),
        note: p.note ?? '',
      })),
    })
    navigate('/purchases')
  }

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!purchase) {
    return <div className="text-center text-muted-foreground py-20">Achat introuvable.</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`Achat — ${purchase.reference ?? 'Sans référence'}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/purchases')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <PurchaseForm
        existing={purchase}
        onSubmit={handleSubmit}
        isLoading={updatePurchase.isPending}
      />
    </div>
  )
}
