import { ClientForm, type ClientFormValues } from '@/features/clients/ClientForm'
import { useCreateClient, useUpdateClient } from '@/hooks/useClients'
import { ResponsiveModal } from '@/components/shared/ResponsiveModal'
import { isUniqueNameError } from '@/lib/utils'
import type { Client } from '@/types'
import type { UseFormSetError } from 'react-hook-form'

interface ClientModalProps {
  client?: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (client: Client) => void
}

export const ClientModal = ({ client, open, onOpenChange, onSuccess }: ClientModalProps) => {
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()

  const isEditing = Boolean(client)
  const isPending = createClient.isPending || updateClient.isPending

  const handleSubmit = async (data: ClientFormValues, setError: UseFormSetError<ClientFormValues>) => {
    const normalized = {
      ...data,
      phone: data.phone || null,
      address: data.address || null,
      ice: data.ice || null,
    }
    try {
      let result;
      if (isEditing && client) {
        result = await updateClient.mutateAsync({ id: client.id, ...normalized })
      } else {
        result = await createClient.mutateAsync(normalized)
      }
      onSuccess?.(result)
      onOpenChange(false)
    } catch (err) {
      if (isUniqueNameError(err)) {
        setError('name', { message: 'Un client avec ce nom existe déjà' })
      }
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Modifier le client' : 'Nouveau client'}
    >
      <ClientForm
        defaultValues={client ?? undefined}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
        isLoading={isPending}
        isModal={true}
      />
    </ResponsiveModal>
  )
}
