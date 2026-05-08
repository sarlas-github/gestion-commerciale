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

  const formId = "client-new-form"

  return (
    <div className="space-y-6 max-w-lg pb-24 md:pb-0">
      <PageHeader
        title="Nouveau client"
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="mr-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        actions={
          <div className="hidden md:flex gap-3">
            <Button variant="outline" onClick={() => navigate('/clients')} disabled={createClient.isPending}>
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={createClient.isPending}>
              Enregistrer
            </Button>
          </div>
        }
      />
      <ClientForm
        id={formId}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/clients')}
        isLoading={createClient.isPending}
      />

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t md:hidden flex justify-end gap-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="bg-card" onClick={() => navigate('/clients')} disabled={createClient.isPending}>
          Annuler
        </Button>
        <Button type="submit" form={formId} disabled={createClient.isPending}>
          Enregistrer
        </Button>
      </div>
    </div>
  )
}





