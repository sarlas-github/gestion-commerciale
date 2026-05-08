import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ClientForm, type ClientFormValues } from '@/features/clients/ClientForm'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import { isUniqueNameError } from '@/lib/utils'
import type { UseFormSetError } from 'react-hook-form'

export const ClientEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id!)
  const updateClient = useUpdateClient()

  const handleSubmit = async (values: ClientFormValues, setError: UseFormSetError<ClientFormValues>) => {
    try {
      await updateClient.mutateAsync({ id: id!, ...values })
      navigate('/clients')
    } catch (err) {
      if (isUniqueNameError(err)) {
        setError('name', { message: 'Un client avec ce nom existe déjà' })
      }
    }
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!client) return null

  const formId = "client-edit-form"

  return (
    <div className="space-y-6 max-w-lg pb-24 md:pb-0">
      <PageHeader
        title="Modifier le client"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex gap-3">
            <Button variant="outline" onClick={() => navigate('/clients')} disabled={updateClient.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={updateClient.isPending}>
              Enregistrer
            </Button>
          </div>
        }
      />
      <ClientForm
        id={formId}
        defaultValues={client}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/clients')}
        isLoading={updateClient.isPending}
      />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t md:hidden flex justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="bg-card" onClick={() => navigate('/clients')} disabled={updateClient.isPending}>
          Annuler
        </Button>
        <Button type="submit" form={formId} disabled={updateClient.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}





