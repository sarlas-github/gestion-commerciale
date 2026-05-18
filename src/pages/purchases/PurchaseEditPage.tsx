import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { PurchaseForm, type PurchaseFormValues } from '@/features/purchases/PurchaseForm'
import { usePurchase, useUpdatePurchase } from '@/hooks/usePurchases'

export const PurchaseEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backTo = (location.state as { from?: string } | null)?.from ?? '/purchases'
  const { data: purchase, isLoading } = usePurchase(id!)
  const updatePurchase = useUpdatePurchase()

  const handleSubmit = async (values: PurchaseFormValues) => {
    await updatePurchase.mutateAsync({
      id: id!,
      ...values,
    })
    navigate(backTo)
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

  const formId = "purchase-edit-form"

  return (
    <div className="space-y-6 max-w-3xl pb-12 md:pb-0">
      <PageHeader
        title={`Achat — ${purchase.reference ?? 'Sans référence'}`}
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate(backTo)} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          purchase.status !== 'cancelled' ? (
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate(-1)} disabled={updatePurchase.isPending}>
                Annuler
              </Button>
              <Button type="submit" form={formId} disabled={updatePurchase.isPending}>
                Enregistrer
              </Button>
            </div>
          ) : undefined
        }
      />
      <PurchaseForm
        id={formId}
        key={purchase.id}
        existing={purchase}
        onSubmit={handleSubmit}
      />

      {/* Mobile Sticky Bar */}
      {purchase.status !== 'cancelled' && (
        <div className="fixed bottom-0 left-0 right-0 h-16 px-4 bg-card border-t md:hidden flex items-center justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button variant="outline" className="bg-card" onClick={() => navigate(backTo)} disabled={updatePurchase.isPending}>
            Annuler
          </Button>
          <Button type="submit" form={formId} disabled={updatePurchase.isPending}>
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  )
}





