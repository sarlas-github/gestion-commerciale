import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Supplier } from '@/types'

const supplierSchema = z.object({
  name: z.string().min(1, 'Ce champ est obligatoire'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  ice: z.string().optional().or(z.literal('')),
})

export type SupplierFormValues = z.infer<typeof supplierSchema>

interface SupplierFormProps {
  defaultValues?: Partial<Supplier>
  onSubmit: (values: SupplierFormValues) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export const SupplierForm = ({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: SupplierFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      phone: defaultValues?.phone ?? '',
      address: defaultValues?.address ?? '',
      ice: defaultValues?.ice ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Nom <span className="text-destructive">*</span>
        </Label>
        <Input id="name" {...register('name')} placeholder="Nom du fournisseur" />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" {...register('phone')} placeholder="06XXXXXXXX" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" {...register('address')} placeholder="Ville, adresse..." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ice">ICE</Label>
        <Input id="ice" {...register('ice')} placeholder="Identifiant commun de l'entreprise" />
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
