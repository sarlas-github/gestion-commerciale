import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/shared/PhoneInput'
import type { Client } from '@/types'

const clientSchema = z.object({
  name: z.string().min(1, 'Ce champ est obligatoire'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  ice: z.string().optional().or(z.literal('')),
})

export type ClientFormValues = z.infer<typeof clientSchema>

interface ClientFormProps {
  defaultValues?: Partial<Client>
  onSubmit: (values: ClientFormValues) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const ClientForm = ({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: ClientFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      phone: defaultValues?.phone ?? '',
      address: defaultValues?.address ?? '',
      ice: defaultValues?.ice ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cf-name">
          Nom <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              id="cf-name"
              placeholder="Nom du client"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-phone">Téléphone</Label>
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              id="cf-phone"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-address">Adresse</Label>
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <Input
              id="cf-address"
              placeholder="Ville, adresse..."
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-ice">ICE</Label>
        <Controller
          name="ice"
          control={control}
          render={({ field }) => (
            <Input
              id="cf-ice"
              placeholder="Identifiant commun de l'entreprise"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          )}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
