import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SaleForm, type SaleFormValues } from '@/features/sales/SaleForm'
import { useCreateSale } from '@/hooks/useSales'

export const SaleNewPage = () => {
  const navigate = useNavigate()
  const createSale = useCreateSale()

  const handleSubmit = async (values: SaleFormValues) => {
    await createSale.mutateAsync({
      client_id: values.client_id,
      date: values.date,
      reference: values.reference ?? '',
      note: values.note ?? '',
      items: values.items.map(i => ({
        product_id: i.product_id,
        quantity: Number(i.quantity),
        pieces_count: Number(i.pieces_count),
        unit_price: Number(i.unit_price),
      })),
      payments: values.payments.map(p => ({
        date: p.date,
        amount: Number(p.amount),
        note: p.note ?? '',
      })),
    })
    navigate('/sales')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Nouvelle vente"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <SaleForm onSubmit={handleSubmit} isLoading={createSale.isPending} />
    </div>
  )
}
