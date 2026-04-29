import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClientForm } from '@/features/clients/ClientForm'
import { useCreateClient } from '@/hooks/useClients'

export const ClientNewPage = () => {
  const navigate = useNavigate()
  const createClient = useCreateClient()

  return (
    <div className="max-w-lg">
      <PageHeader title="Nouveau client" />
      <div className="rounded-xl border bg-card p-6">
        <ClientForm
          onSubmit={async values => {
            await createClient.mutateAsync({
              name: values.name,
              phone: values.phone || null,
              address: values.address || null,
              ice: values.ice || null,
            })
            navigate('/clients')
          }}
          onCancel={() => navigate('/clients')}
          isLoading={createClient.isPending}
        />
      </div>
    </div>
  )
}
