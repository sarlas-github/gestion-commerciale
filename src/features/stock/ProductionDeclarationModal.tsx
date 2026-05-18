import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { ResponsiveModal } from '@/components/shared/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EntityAutocomplete } from '@/components/shared/EntityAutocomplete'
import { ProductModal } from '@/features/products/ProductModal'
import { useProducts, useAdjustStock } from '@/hooks/useProducts'
import { useProfile } from '@/hooks/useProfile'

const schema = z.object({
  product_id: z.string().min(1, 'Veuillez choisir un produit'),
  type: z.enum(['in', 'out']),
  quantity: z
    .number({ invalid_type_error: 'Veuillez entrer un nombre valide' })
    .min(1, 'La quantité doit être au moins 1'),
  note: z.string().min(1, 'Ce champ est obligatoire'),
})

type FormData = z.infer<typeof schema>

interface ProductionDeclarationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultNature?: 'matiere_premiere' | 'produit_fini'
}

export const ProductionDeclarationModal = ({ 
  open, 
  onOpenChange,
  defaultNature 
}: ProductionDeclarationModalProps) => {
  const { data: allProducts = [] } = useProducts()
  const adjustStock = useAdjustStock()
  const { data: profile } = useProfile()
  const isProduction = profile?.business_mode === 'production'

  const products = useMemo(() => {
    if (!defaultNature) return allProducts
    return allProducts.filter(p => p.nature === defaultNature)
  }, [allProducts, defaultNature])

  const [showNewProduct, setShowNewProduct] = useState(false)

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { 
      type: defaultNature === 'matiere_premiere' ? 'out' : (defaultNature === 'produit_fini' ? 'in' : 'in' as FormData['type']), 
      quantity: undefined, 
      note: defaultNature === 'matiere_premiere' ? 'Consommation' : (defaultNature === 'produit_fini' ? 'Production' : '') 
    },
  })

  const productId = watch('product_id')
  const selectedProduct = useMemo(() => products.find(p => p.id === productId), [products, productId])
  const opType = watch('type')
  const qty = Number(watch('quantity')) || 0
  
  const currentQty = selectedProduct?.stock?.quantity ?? 0
  const newQty = opType === 'in' ? currentQty + qty : currentQty - qty
  const nature = selectedProduct?.nature

  useEffect(() => {
    if (open) {
      reset({ 
        type: defaultNature === 'matiere_premiere' ? 'out' : (defaultNature === 'produit_fini' ? 'in' : 'in' as FormData['type']), 
        quantity: undefined, 
        note: defaultNature === 'matiere_premiere' ? 'Consommation' : (defaultNature === 'produit_fini' ? 'Production' : '') 
      })
    }
  }, [open, reset, defaultNature])

  const onSubmit = async (data: FormData) => {
    if (!selectedProduct) return
    await adjustStock.mutateAsync({
      productId: selectedProduct.id,
      currentStockId: selectedProduct.stock?.id ?? null,
      currentQuantity: currentQty,
      type: data.type,
      quantity: data.quantity,
      note: data.note,
    })
    onOpenChange(false)
  }

  const handleProductSuccess = (product: { id: string }) => {
    setValue('product_id', product.id)
    setShowNewProduct(false)
  }

  return (
    <>
      <ProductModal
        open={showNewProduct}
        onOpenChange={setShowNewProduct}
        onSuccess={handleProductSuccess}
        isProduction={isProduction}
        defaultNature={defaultNature}
      />

      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title="Déclaration Production / Consommation"
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Sélection Produit */}
          <div className="space-y-1.5">
            <Label>Produit <span className="text-destructive">*</span></Label>
            <Controller
              name="product_id"
              control={control}
              render={({ field }) => (
                <EntityAutocomplete
                  value={field.value}
                  onChange={field.onChange}
                  options={products.map(p => ({ id: p.id, label: p.name }))}
                  placeholder="Rechercher un produit..."
                  onAddNew={() => setShowNewProduct(true)}
                  errorMessage={errors.product_id?.message}
                />
              )}
            />
          </div>

          {selectedProduct && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nature</span>
                <span className="font-bold uppercase text-primary">
                  {nature === 'matiere_premiere' ? 'Matière Première' : 'Produit Fini'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock actuel</span>
                <span className="font-medium">{currentQty}</span>
              </div>
            </div>
          )}

          {/* Type d'opération */}
          <div className="space-y-1.5">
            <Label>Type d'opération</Label>
            <div className="flex overflow-hidden rounded-lg border border-input bg-muted/30">
              <div
                className={`flex-1 py-2 text-center text-sm font-bold transition-colors ${
                  opType === 'in' ? 'bg-green-600 text-white shadow-sm' : 'text-muted-foreground opacity-50 cursor-not-allowed'
                }`}
              >
                ENTRÉES (IN)
              </div>
              <div className="w-px bg-border" />
              <div
                className={`flex-1 py-2 text-center text-sm font-bold transition-colors ${
                  opType === 'out' ? 'bg-red-600 text-white shadow-sm' : 'text-muted-foreground opacity-50 cursor-not-allowed'
                }`}
              >
                SORTIES (OUT)
              </div>
            </div>
          </div>

          {/* Quantité */}
          <div className="space-y-1.5">
            <Label htmlFor="dec-qty">
              Quantité à déclarer <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <Input
                  id="dec-qty"
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

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="dec-note">Note</Label>
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <Input
                  id="dec-note"
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  {...field}
                />
              )}
            />
          </div>

          {/* Aperçu résultat */}
          {selectedProduct && qty > 0 && (
            <div className="rounded-lg border bg-card p-3 flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Nouveau stock estimé</span>
              <span className={`font-bold tabular-nums ${opType === 'in' ? 'text-green-600' : 'text-red-600'}`}>
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
            <Button type="submit" disabled={adjustStock.isPending || !selectedProduct}>
              {adjustStock.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer la déclaration
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </>
  )
}
