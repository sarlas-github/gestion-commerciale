import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdjustStock } from '@/hooks/useProducts'
import type { ProductWithStock } from '@/types'

const schema = z.object({
  quantity: z
    .number({ invalid_type_error: 'Veuillez entrer un nombre valide' })
    .min(0, 'La valeur doit être positive'),
  note: z.string().min(1, 'Ce champ est obligatoire'),
})

type FormData = z.infer<typeof schema>

interface StockAdjustModalProps {
  product: ProductWithStock | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const StockAdjustModal = ({
  product,
  open,
  onOpenChange,
}: StockAdjustModalProps) => {
  const adjustStock = useAdjustStock()
  const currentQty = product?.stock?.quantity ?? 0

  const {
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: currentQty, note: '' },
  })

  const newQty = Number(watch('quantity')) || 0
  const delta = newQty - currentQty
  const isIncrease = delta >= 0

  useEffect(() => {
    if (open) reset({ quantity: currentQty, note: '' })
  }, [open, reset, currentQty])

  const onSubmit = async (data: FormData) => {
    if (!product?.stock) return
    await adjustStock.mutateAsync({
      productId: product.id,
      currentStockId: product.stock.id,
      currentQuantity: currentQty,
      quantity: data.quantity, // Nouvelle quantité absolue
      note: data.note,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Correction stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Produit (lecture seule) */}
          <div className="space-y-1.5">
            <Label>Produit</Label>
            <div className="flex h-8 items-center rounded-lg border border-input bg-muted/30 px-2.5 text-sm">
              {product?.name ?? '—'}
            </div>
          </div>

          {/* Stock Actuel */}
          <div className="space-y-1.5">
            <Label>Stock actuel</Label>
            <div className="flex h-8 items-center rounded-lg border border-input bg-muted/30 px-2.5 text-sm font-medium">
              {currentQty}
            </div>
          </div>

          {/* Nouveau Stock */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-qty">
              Nouveau stock <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <Input
                  id="adj-qty"
                  type="number"
                  min={0}
                  onFocus={e => e.target.select()}
                  value={field.value ?? ''}
                  onChange={e =>
                    field.onChange(
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                  onBlur={field.onBlur}
                  aria-invalid={Boolean(errors.quantity)}
                />
              )}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          {/* Note (obligatoire) */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-note">
              Note <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <Input
                  id="adj-note"
                  placeholder="Motif de la correction"
                  {...field}
                  aria-invalid={Boolean(errors.note)}
                />
              )}
            />
            {errors.note && (
              <p className="text-sm text-destructive">{errors.note.message}</p>
            )}
          </div>

          {/* Différence */}
          <div className="rounded-lg border bg-muted/30 p-3 flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Correction à appliquer</span>
            <span className={`font-bold tabular-nums ${isIncrease ? 'text-green-600' : 'text-amber-600'}`}>
              {isIncrease ? '+' : ''}{delta}
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={adjustStock.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={adjustStock.isPending}
            >
              {adjustStock.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
