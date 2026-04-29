import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClientForm } from '@/features/clients/ClientForm'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { Skeleton } from '@/components/ui/skeleton'

export const ClientEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id ?? '')
  const updateClient = useUpdateClient()

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    )
  }

  if (!client) {
    return <p className="text-muted-foreground">Client introuvable.</p>
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Modifier le client" />
      <div className="rounded-xl border bg-card p-6">
        <ClientForm
          defaultValues={client}
          onSubmit={async values => {
            await updateClient.mutateAsync({
              id: id!,
              name: values.name,
              phone: values.phone || null,
              address: values.address || null,
              ice: values.ice || null,
            })
            navigate('/clients')
          }}
          onCancel={() => navigate('/clients')}
          isLoading={updateClient.isPending}
        />
      </div>
    </div>
  )
}
