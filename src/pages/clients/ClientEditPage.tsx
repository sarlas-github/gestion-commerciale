import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClientForm, type ClientFormValues } from '@/features/clients/ClientForm'
import { useClient, useUpdateClient } from '@/hooks/useClients'

export const ClientEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id!)
  const updateClient = useUpdateClient()

  const handleSubmit = async (values: ClientFormValues) => {
    await updateClient.mutateAsync({ id: id!, ...values })
    navigate('/clients')
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!client) return null

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Modifier le client"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <ClientForm
        defaultValues={client}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/clients')}
        isLoading={updateClient.isPending}
      />
    </div>
  )
}
