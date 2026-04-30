import { ClientForm, type ClientFormValues } from '@/features/clients/ClientForm'
import { useCreateClient, useUpdateClient } from '@/hooks/useClients'
import { ResponsiveModal } from '@/components/shared/ResponsiveModal'
import type { Client } from '@/types'

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

  const handleSubmit = async (data: ClientFormValues) => {
    let result;
    if (isEditing && client) {
      result = await updateClient.mutateAsync({ id: client.id, ...data })
    } else {
      result = await createClient.mutateAsync(data)
    }
    onSuccess?.(result)
    onOpenChange(false)
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
      />
    </ResponsiveModal>
  )
}
