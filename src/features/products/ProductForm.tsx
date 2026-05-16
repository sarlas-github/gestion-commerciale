import { useEffect } from 'react'
import { useForm, Controller, type UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfile } from '@/hooks/useProfile'
import type { ProductWithStock } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Ce champ est obligatoire'),
  type: z.enum(['individual', 'pack']),
  nature: z.enum(['revente', 'matiere_premiere', 'produit_fini']).default('revente'),
  pieces_count: z
    .number({ invalid_type_error: 'Veuillez entrer un nombre valide' })
    .min(1, 'La valeur doit être supérieure à 0'),
  stock_alert: z.number().min(0),
})

export type ProductFormData = z.infer<typeof schema>

interface ProductFormProps {
  id?: string
  initial?: ProductWithStock | null
  onSubmit: (data: ProductFormData, setError: UseFormSetError<ProductFormData>) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
  isModal?: boolean
  initialNature?: 'revente' | 'matiere_premiere' | 'produit_fini'
  isProduction?: boolean
}

export const ProductForm = ({
  id,
  initial,
  onSubmit,
  onCancel,
  isLoading = false,
  isModal = false,
  initialNature,
  isProduction: isProductionProp,
}: ProductFormProps) => {
  const { data: profile } = useProfile()
  
  // On fait confiance à la prop du parent si elle est fournie (instantané)
  // Sinon on attend le profil (fallback)
  const isProduction = isProductionProp !== undefined 
    ? isProductionProp 
    : (profile?.business_mode === 'production')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    setError,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'individual',
      nature: initial?.nature ?? initialNature ?? 'revente',
      pieces_count: initial?.pieces_count ?? 1,
      stock_alert: initial?.stock_alert ?? 0,
    },
  })

  const type = watch('type')

  useEffect(() => {
    if (type === 'individual') setValue('pieces_count', 1)
  }, [type, setValue])

  // Synchroniser la nature initiale (utile pour les modals et redirections)
  useEffect(() => {
    if (initial?.nature) {
      setValue('nature', initial.nature)
    } else if (initialNature) {
      setValue('nature', initialNature)
    }
  }, [initial?.nature, initialNature, setValue])

  const formContent = (
    <>
      {/* Nom */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">
          Nom <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              id="pf-name"
              placeholder="Nom du produit"
              autoComplete="off"
              {...field}
              aria-invalid={Boolean(errors.name)}
            />
          )}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label>
          Type <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              value="individual"
              {...register('type')}
              className="accent-primary"
            />
            Individuel
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              value="pack"
              {...register('type')}
              className="accent-primary"
            />
            Pack
          </label>
        </div>
      </div>
 
      {/* Nombre de pièces (pack seulement) */}
      {type === 'pack' && (
        <div className="space-y-1.5">
          <Label htmlFor="pf-pieces">
            Nombre de pièces <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="pieces_count"
            control={control}
            render={({ field }) => (
              <Input
                id="pf-pieces"
                type="number"
                min={1}
                onFocus={e => e.target.select()}
                value={field.value ?? ''}
                onChange={e =>
                  field.onChange(
                    e.target.value === '' ? undefined : Number(e.target.value)
                  )
                }
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.pieces_count)}
              />
            )}
          />
          {errors.pieces_count && (
            <p className="text-sm text-destructive">
              {errors.pieces_count.message}
            </p>
          )}
        </div>
      )}

      {/* Nature (Mode Production Uniquement) */}
      {isProduction && (
        <div className="space-y-1.5">
          <Label className={cn(isModal && initialNature && "opacity-70")}>
            Nature du produit {isModal && initialNature && <span className="text-[10px] ml-2 italic">(Fixé par le contexte)</span>}
          </Label>
          <div className="flex flex-wrap gap-4">
            <label className={cn("flex items-center gap-2 cursor-pointer text-sm", isModal && initialNature && initialNature !== 'matiere_premiere' && "opacity-50 cursor-not-allowed")}>
              <input
                type="radio"
                value="matiere_premiere"
                {...register('nature')}
                disabled={Boolean(isModal && initialNature)}
                className="accent-primary"
              />
              Matière Première
            </label>
            <label className={cn("flex items-center gap-2 cursor-pointer text-sm", isModal && initialNature && initialNature !== 'produit_fini' && "opacity-50 cursor-not-allowed")}>
              <input
                type="radio"
                value="produit_fini"
                {...register('nature')}
                disabled={Boolean(isModal && initialNature)}
                className="accent-primary"
              />
              Produit Fini
            </label>
          </div>
        </div>
      )}


      {/* Seuil alerte stock */}
      <div className="space-y-1.5">
        <Label htmlFor="pf-alert">Seuil alerte stock</Label>
        <Controller
          name="stock_alert"
          control={control}
          render={({ field }) => (
            <Input
              id="pf-alert"
              type="number"
              min={0}
              onFocus={e => e.target.select()}
              value={field.value ?? ''}
              onChange={e =>
                field.onChange(
                  e.target.value === '' ? 0 : Number(e.target.value)
                )
              }
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.stock_alert)}
            />
          )}
        />
        {errors.stock_alert && (
          <p className="text-sm text-destructive">{errors.stock_alert.message}</p>
        )}
      </div>

      {/* Actions (uniquement si modal) */}
      {isModal && (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      )}
    </>
  )

  return (
    <form id={id} onSubmit={handleSubmit((data) => onSubmit(data, setError))} noValidate className={isModal ? 'space-y-5' : 'space-y-5 rounded-lg border bg-card p-4 sm:p-6'}>
      {formContent}
    </form>
  )
}
