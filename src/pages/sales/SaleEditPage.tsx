import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SaleForm, type SaleFormValues } from '@/features/sales/SaleForm'
import { useSale, useUpdateSale } from '@/hooks/useSales'

export const SaleEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: sale, isLoading } = useSale(id!)
  const updateSale = useUpdateSale()

  const handleSubmit = async (values: SaleFormValues) => {
    await updateSale.mutateAsync({
      id: id!,
      payments: values.payments.map(p => ({
        date: p.date,
        amount: Number(p.amount),
        note: p.note ?? '',
      })),
    })
    navigate('/sales')
  }

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!sale) {
    return <div className="text-center text-muted-foreground py-20">Vente introuvable.</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`Vente — ${sale.clients?.name ?? 'Client inconnu'}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <SaleForm
        existing={sale}
        onSubmit={handleSubmit}
        isLoading={updateSale.isPending}
      />
    </div>
  )
}
