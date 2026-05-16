import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { ResponsiveModal } from '@/components/shared/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdjustStock } from '@/hooks/useProducts'
import type { ProductWithStock } from '@/types'

const schema = z.object({
  type: z.enum(['in', 'out']),
  quantity: z
    .number({ invalid_type_error: 'Veuillez entrer un nombre valide' })
    .min(1, 'La quantité doit être au moins 1'),
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
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'in', quantity: undefined, note: '' },
  })

  const opType = watch('type')
  const qty = Number(watch('quantity')) || 0
  const newQty = opType === 'in' ? currentQty + qty : currentQty - qty

  useEffect(() => {
    if (open) reset({ type: 'in', quantity: undefined, note: '' })
  }, [open, reset])

  const onSubmit = async (data: FormData) => {
    if (!product?.stock) return
    await adjustStock.mutateAsync({
      productId: product.id,
      currentStockId: product.stock.id,
      currentQuantity: currentQty,
      type: data.type,
      quantity: data.quantity,
      note: data.note,
    })
    onOpenChange(false)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Correction stock"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Produit (lecture seule) */}
        <div className="space-y-1.5">
          <Label>Produit</Label>
          <div className="flex h-8 items-center rounded-lg border border-input bg-card px-2.5 text-sm">
            {product?.name ?? '—'}
          </div>
        </div>

        {/* Stock Actuel */}
        <div className="space-y-1.5">
          <Label>Stock actuel</Label>
          <div className="flex h-8 items-center rounded-lg border border-input bg-card px-2.5 text-sm font-medium">
            {currentQty}
          </div>
        </div>

        {/* Type d'opération IN / OUT */}
        <div className="space-y-1.5">
          <Label>
            Type d'opération <span className="text-destructive">*</span>
          </Label>
          <div className="flex overflow-hidden rounded-lg border border-input">
            <button
              type="button"
              onClick={() => setValue('type', 'in')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${opType === 'in'
                  ? 'bg-green-600 text-white'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
                }`}
            >
              ENTRÉE (IN)
            </button>
            <div className="w-px bg-border" />
            <button
              type="button"
              onClick={() => setValue('type', 'out')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${opType === 'out'
                  ? 'bg-red-600 text-white'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
                }`}
            >
              SORTIE (OUT)
            </button>
          </div>
        </div>

        {/* Quantité (delta) */}
        <div className="space-y-1.5">
          <Label htmlFor="adj-qty">
            Quantité <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <Input
                id="adj-qty"
                type="number"
                min={1}
                placeholder="0"
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

        {/* Aperçu résultat */}
        {qty > 0 && (
          <div className="rounded-lg border bg-card p-3 flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Nouveau stock</span>
            <span className={`font-bold tabular-nums ${opType === 'in' ? 'text-green-600' : 'text-amber-600'}`}>
              {currentQty} {opType === 'in' ? '+' : '−'} {qty} = {newQty}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adjustStock.isPending}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={adjustStock.isPending}>
            {adjustStock.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Enregistrer
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
