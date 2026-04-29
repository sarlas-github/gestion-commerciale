import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useClients, useCreateClient } from '@/hooks/useClients'
import { useProducts, useCreateProduct } from '@/hooks/useProducts'
import { ClientForm, type ClientFormValues } from '@/features/clients/ClientForm'
import { formatCurrency, getPaymentStatus, toISODate } from '@/lib/utils'
import type { Sale } from '@/types'

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  product_id: z.string().min(1, 'Choisir un produit'),
  quantity: z.number({ invalid_type_error: 'Entrer une quantité' }).min(1, 'Min 1'),
  unit_price: z.number({ invalid_type_error: 'Entrer un prix' }).min(0),
  pieces_count: z.number().min(1).default(1),
})

const paymentSchema = z.object({
  date: z.string().min(1, 'Date obligatoire'),
  amount: z.number({ invalid_type_error: 'Entrer un montant' }).min(0),
  note: z.string().optional().or(z.literal('')),
})

export const saleSchema = z.object({
  client_id: z.string().min(1, 'Client obligatoire'),
  date: z.string().min(1, 'Date obligatoire'),
  note: z.string().optional().or(z.literal('')),
  items: z.array(itemSchema).min(1, 'Ajouter au moins un produit'),
  payments: z.array(paymentSchema),
})

export type SaleFormValues = z.infer<typeof saleSchema>

// ── Badge statut ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Payé</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SaleFormProps {
  existing?: Sale
  onSubmit: (values: SaleFormValues) => Promise<void>
  isLoading?: boolean
}

// ── Composant principal ───────────────────────────────────────────────────────

export const SaleForm = ({ existing, onSubmit, isLoading = false }: SaleFormProps) => {
  const navigate = useNavigate()
  const today = toISODate(new Date())

  const hasExistingPayments =
    existing && existing.client_payments && existing.client_payments.length > 0

  const [showNewClient, setShowNewClient] = useState(false)

  const { data: clients = [] } = useClients()
  const { data: products = [] } = useProducts()
  const createClient = useCreateClient()
  const createProduct = useCreateProduct()

  const defaultItems = existing?.sale_items?.map(i => ({
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    pieces_count: i.pieces_count,
  })) ?? [{ product_id: '', quantity: 1, unit_price: 0, pieces_count: 1 }]

  const defaultPayments = existing?.client_payments?.map(p => ({
    date: p.date,
    amount: p.amount,
    note: p.note ?? '',
  })) ?? []

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      client_id: existing?.client_id ?? '',
      date: existing?.date ?? today,
      note: existing?.note ?? '',
      items: defaultItems,
      payments: defaultPayments,
    },
  })

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: 'items',
  })

  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
    control,
    name: 'payments',
  })

  const watchedItems = watch('items')
  const watchedPayments = watch('payments')

  const total = watchedItems.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0
  )
  const paid = watchedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const remaining = total - paid
  const status = getPaymentStatus(paid, total)

  const handleQuickClient = useCallback(
    async (values: ClientFormValues) => {
      await createClient.mutateAsync({
        name: values.name,
        phone: values.phone || null,
        address: values.address || null,
        ice: values.ice || null,
      })
      setShowNewClient(false)
    },
    [createClient]
  )

  const handleQuickProduct = useCallback(async () => {
    const name = window.prompt('Nom du produit :')
    if (!name?.trim()) return
    await createProduct.mutateAsync({
      name: name.trim(),
      type: 'individual',
      pieces_count: 1,
      stock_alert: 0,
    })
  }, [createProduct])

  const handleProductChange = (idx: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setValue(`items.${idx}.pieces_count`, product.pieces_count)
    }
  }

  return (
    <>
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSubmit={handleQuickClient}
            onCancel={() => setShowNewClient(false)}
            isLoading={createClient.isPending}
          />
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        {/* ── Entête ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Informations</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Client */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Client <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Controller
                  name="client_id"
                  control={control}
                  render={({ field }) => (
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={field.value}
                      onChange={field.onChange}
                      ref={field.ref}
                    >
                      <option value="">— Choisir un client —</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setShowNewClient(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.client_id && (
                <p className="text-xs text-destructive">{errors.client_id.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label>
                Date <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Input type="date" value={field.value} onChange={field.onChange} ref={field.ref} />
                )}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <Input placeholder="Note interne (optionnel)" value={field.value ?? ''} onChange={field.onChange} ref={field.ref} />
                )}
              />
            </div>
          </div>
        </div>

        {/* ── Produits ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produits</h2>
            {!hasExistingPayments && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendItem({ product_id: '', quantity: 1, unit_price: 0, pieces_count: 1 })}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter une ligne
              </Button>
            )}
          </div>

          {hasExistingPayments && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
              ⚠️ Des paiements ont été enregistrés — les lignes produits ne sont plus modifiables.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium w-full">Produit</th>
                  <th className="pb-2 font-medium text-right pr-3 whitespace-nowrap">Qté</th>
                  <th className="pb-2 font-medium text-right pr-3 whitespace-nowrap">Prix unit.</th>
                  <th className="pb-2 font-medium text-right pr-3 whitespace-nowrap">Sous-total</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {itemFields.map((field, idx) => {
                  const qty = Number(watchedItems[idx]?.quantity) || 0
                  const price = Number(watchedItems[idx]?.unit_price) || 0
                  const subtotal = qty * price
                  const selectedProductId = watchedItems[idx]?.product_id
                  const productData = products.find(p => p.id === selectedProductId)
                  const availableStock = productData?.stock?.quantity ?? 0
                  const stockWarning = Boolean(selectedProductId) && qty > availableStock

                  return (
                    <tr key={field.id}>
                      {/* Produit */}
                      <td className="py-2 pr-3">
                        {hasExistingPayments ? (
                          <span className="text-muted-foreground">
                            {products.find(p => p.id === field.product_id)?.name ?? field.product_id}
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Controller
                                name={`items.${idx}.product_id`}
                                control={control}
                                render={({ field: f }) => (
                                  <select
                                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={f.value}
                                    onChange={e => {
                                      f.onChange(e.target.value)
                                      handleProductChange(idx, e.target.value)
                                    }}
                                    ref={f.ref}
                                  >
                                    <option value="">— Produit —</option>
                                    {products.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                )}
                              />
                              {stockWarning && (
                                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Stock disponible : {availableStock}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              title="Nouveau produit"
                              onClick={handleQuickProduct}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {errors.items?.[idx]?.product_id && (
                          <p className="text-xs text-destructive mt-0.5">
                            {errors.items[idx]?.product_id?.message}
                          </p>
                        )}
                      </td>

                      {/* Quantité */}
                      <td className="py-2 pr-3">
                        {hasExistingPayments ? (
                          <span className="block text-right">{field.quantity}</span>
                        ) : (
                          <Controller
                            name={`items.${idx}.quantity`}
                            control={control}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                min={1}
                                className="w-20 text-right h-8"
                                value={f.value}
                                onChange={e => f.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                onFocus={e => e.target.select()}
                                ref={f.ref}
                              />
                            )}
                          />
                        )}
                      </td>

                      {/* Prix unitaire */}
                      <td className="py-2 pr-3">
                        {hasExistingPayments ? (
                          <span className="block text-right">{formatCurrency(field.unit_price)}</span>
                        ) : (
                          <Controller
                            name={`items.${idx}.unit_price`}
                            control={control}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-28 text-right h-8"
                                value={f.value}
                                onChange={e => f.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                onFocus={e => e.target.select()}
                                ref={f.ref}
                              />
                            )}
                          />
                        )}
                      </td>

                      {/* Sous-total */}
                      <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">
                        {formatCurrency(subtotal)}
                      </td>

                      {/* Supprimer */}
                      <td className="py-2">
                        {!hasExistingPayments && itemFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="pt-3 text-right font-semibold pr-3">Total :</td>
                  <td className="pt-3 text-right font-bold pr-3">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {typeof errors.items?.message === 'string' && (
            <p className="text-xs text-destructive">{errors.items.message}</p>
          )}
        </div>

        {/* ── Paiements ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Paiements</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendPayment({ date: today, amount: remaining > 0 ? remaining : 0, note: '' })}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter un paiement
            </Button>
          </div>

          {paymentFields.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Montant</th>
                    <th className="pb-2 font-medium">Note</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paymentFields.map((field, idx) => (
                    <tr key={field.id}>
                      <td className="py-2 pr-3">
                        <Controller
                          name={`payments.${idx}.date`}
                          control={control}
                          render={({ field: f }) => (
                            <Input
                              type="date"
                              className="h-8 w-36"
                              value={f.value}
                              onChange={f.onChange}
                              ref={f.ref}
                            />
                          )}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Controller
                          name={`payments.${idx}.amount`}
                          control={control}
                          render={({ field: f }) => (
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-8 w-32 text-right"
                              value={f.value}
                              onChange={e => f.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                              onFocus={e => e.target.select()}
                              ref={f.ref}
                            />
                          )}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Controller
                          name={`payments.${idx}.note`}
                          control={control}
                          render={({ field: f }) => (
                            <Input
                              className="h-8"
                              placeholder="Note..."
                              value={f.value ?? ''}
                              onChange={f.onChange}
                              ref={f.ref}
                            />
                          )}
                        />
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removePayment(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Récapitulatif financier */}
          <div className="flex flex-col items-end gap-1 border-t pt-4 text-sm">
            <div className="flex gap-8">
              <span className="text-muted-foreground">Total :</span>
              <span className="font-semibold w-32 text-right">{formatCurrency(total)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-muted-foreground">Payé :</span>
              <span className="font-semibold w-32 text-right text-green-600">{formatCurrency(paid)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-muted-foreground">Reste :</span>
              <span className={`font-bold w-32 text-right ${remaining > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {formatCurrency(remaining)}
                {remaining > 0 && ' 🔴'}
              </span>
            </div>
            <div className="flex gap-8 items-center mt-1">
              <span className="text-muted-foreground">Statut :</span>
              <div className="w-32 flex justify-end">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isLoading}>
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </>
  )
}
