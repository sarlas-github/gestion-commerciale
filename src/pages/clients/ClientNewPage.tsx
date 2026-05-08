import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClientForm, type ClientFormValues } from '@/features/clients/ClientForm'
import { useCreateClient } from '@/hooks/useClients'
import { isUniqueNameError } from '@/lib/utils'
import type { UseFormSetError } from 'react-hook-form'

export const ClientNewPage = () => {
  const navigate = useNavigate()
  const createClient = useCreateClient()

  const handleSubmit = async (values: ClientFormValues, setError: UseFormSetError<ClientFormValues>) => {
    try {
      await createClient.mutateAsync({
        ...values,
        phone: values.phone || null,
        address: values.address || null,
        ice: values.ice || null,
      })
      navigate('/clients')
    } catch (err) {
      if (isUniqueNameError(err)) {
        setError('name', { message: 'Un client avec ce nom existe déjà' })
      }
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Nouveau client"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        }
      />
      <ClientForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/clients')}
        isLoading={createClient.isPending}
      />
    </div>
  )
}





