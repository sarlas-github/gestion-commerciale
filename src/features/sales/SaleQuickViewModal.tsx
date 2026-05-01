import { useNavigate } from 'react-router-dom'
import { Loader2, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSale } from '@/hooks/useSales'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { PaymentStatus } from '@/types'

const STATUS_LABEL: Record<PaymentStatus, { label: string; className: string }> = {
  paid:    { label: 'Payé',    className: 'text-green-600' },
  partial: { label: 'Partiel', className: 'text-orange-500' },
  unpaid:  { label: 'Impayé',  className: 'text-destructive' },
}

interface Props {
  saleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SaleQuickViewModal = ({ saleId, open, onOpenChange }: Props) => {
  const navigate = useNavigate()
  const { data: sale, isLoading } = useSale(saleId ?? '')

  const status = sale ? STATUS_LABEL[sale.status] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? 'Chargement…' : sale ? `Vente — ${sale.reference ?? '—'}` : 'Vente'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sale ? (
          <div className="space-y-4">
            {/* Infos principales */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{sale.clients?.name ?? '—'}</span>

              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(sale.date)}</span>

              <span className="text-muted-foreground">Statut</span>
              <span className={`font-medium ${status?.className}`}>{status?.label}</span>

              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{formatCurrency(sale.total)}</span>

              <span className="text-muted-foreground">Payé</span>
              <span className="text-green-600">{formatCurrency(sale.paid)}</span>

              <span className="text-muted-foreground">Reste</span>
              <span className={sale.remaining > 0 ? 'text-destructive font-medium' : ''}>
                {formatCurrency(sale.remaining)}
              </span>
            </div>

            {/* Lignes produits */}
            {(sale.sale_items?.length ?? 0) > 0 && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Produits
                  </p>
                  <div className="space-y-1">
                    {sale.sale_items!.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span>{item.products?.name ?? '—'}</span>
                        <span className="text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Vente introuvable.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {sale && (
            <Button
              onClick={() => {
                onOpenChange(false)
                navigate(`/sales/${sale.id}/edit`)
              }}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Voir la vente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
