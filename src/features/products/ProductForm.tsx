import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProductWithStock } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Ce champ est obligatoire'),
  type: z.enum(['individual', 'pack']),
  pieces_count: z
    .number({ invalid_type_error: 'Veuillez entrer un nombre valide' })
    .min(1, 'La valeur doit être supérieure à 0'),
  stock_alert: z.number().min(0),
})

export type ProductFormData = z.infer<typeof schema>

interface ProductFormProps {
  initial?: ProductWithStock | null
  onSubmit: (data: ProductFormData) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const ProductForm = ({
  initial,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      type: initial?.type ?? 'individual',
      pieces_count: initial?.pieces_count ?? 1,
      stock_alert: initial?.stock_alert ?? 0,
    },
  })

  const type = watch('type')

  useEffect(() => {
    if (type === 'individual') setValue('pieces_count', 1)
  }, [type, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
