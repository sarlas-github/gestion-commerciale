import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useClients } from '@/hooks/useClients'
import { useProducts } from '@/hooks/useProducts'
import { ClientModal } from '@/features/clients/ClientModal'
import { ProductModal } from '@/features/products/ProductModal'
import { formatCurrency, getPaymentStatus, toISODate } from '@/lib/utils'
import { useNextSaleNumber } from '@/hooks/useSales'
import type { Sale } from '@/types'

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  original_id: z.string().optional(),
  product_id: z.string().min(1, 'Choisir un produit'),
  quantity: z.number({ invalid_type_error: 'Entrer une quantité' }).min(1, 'Min 1'),
  unit_price: z.number({ invalid_type_error: 'Entrer un prix' }).min(0),
  pieces_count: z.number().min(1).default(1),
})

const paymentSchema = z.object({
  date: z.string().min(1, 'Date obligatoire'),
  amount: z.number({ invalid_type_error: 'Entrer un montant' }).min(0),
  note: z.string().optional().or(z.literal('')),
  methode_paiement: z.string().optional().or(z.literal('')),
})

export const saleSchema = z.object({
  client_id: z.string().min(1, 'Client obligatoire'),
  date: z.string().min(1, 'Date obligatoire'),
  reference: z.string().optional().or(z.literal('')),
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
  const [showNewProductIdx, setShowNewProductIdx] = useState<number | null>(null)

  const { data: clients = [] } = useClients()
  const { data: products = [] } = useProducts()
  const { data: nextRef } = useNextSaleNumber()

  const defaultItems = existing?.sale_items?.map(i => ({
    original_id: i.id,
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    pieces_count: Number(i.products?.pieces_count || 1),
  })) ?? [{ product_id: '', quantity: 1, unit_price: 0, pieces_count: 1 }]

  const defaultPayments = existing?.client_payments?.map(p => ({
    date: p.date,
    amount: p.amount,
    note: p.note ?? '',
    methode_paiement: p.methode_paiement ?? '',
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
      reference: existing?.reference ?? '',
      note: existing?.note ?? '',
      items: defaultItems,
      payments: defaultPayments,
    },
  })

  useEffect(() => {
    if (!existing && nextRef && !watch('reference')) {
      setValue('reference', nextRef)
    }
  }, [existing, nextRef, setValue, watch])

  const [newItemIdx, setNewItemIdx] = useState<number | null>(null)
  const selectRefs = useRef<Map<number, HTMLSelectElement>>(new Map())

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

  const total = watchedItems?.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.pieces_count) || 1) * (Number(i.unit_price) || 0),
    0
  ) || 0
  const paid = watchedPayments?.reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0
  const remaining = total - paid
  const status = getPaymentStatus(paid, total)

  const handleQuickClientSuccess = useCallback(
    (client: any) => {
      setValue('client_id', client.id)
      setShowNewClient(false)
    },
    [setValue]
  )

  const handleQuickProductSuccess = useCallback((product: any) => {
    if (showNewProductIdx !== null) {
      setValue(`items.${showNewProductIdx}.product_id`, product.id)
      setValue(`items.${showNewProductIdx}.pieces_count`, product.pieces_count)
    }
    setShowNewProductIdx(null)
  }, [showNewProductIdx, setValue])

  const handleProductChange = (idx: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setValue(`items.${idx}.pieces_count`, product.pieces_count)
    }
  }

  return (
    <>
      <ClientModal
        client={null}
        open={showNewClient}
        onOpenChange={setShowNewClient}
        onSuccess={handleQuickClientSuccess}
      />

      <ProductModal
        product={null}
        open={showNewProductIdx !== null}
        onOpenChange={(open) => !open && setShowNewProductIdx(null)}
        onSuccess={handleQuickProductSuccess}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        {/* ── Entête ── */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Informations</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Client */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Client <span className="text-destructive">*</span></Label>
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
              <Label>Date <span className="text-destructive">*</span></Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Input type="date" value={field.value} onChange={field.onChange} ref={field.ref} />
                )}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            {/* Référence */}
            <div className="space-y-1.5">
              <Label>Référence</Label>
              <Controller
                name="reference"
                control={control}
                render={({ field }) => (
                  <Input placeholder="Auto-généré" {...field} className="font-mono" />
                )}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5 sm:col-span-2">
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
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produits</h2>
            {!hasExistingPayments && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  appendItem({ product_id: '', quantity: 1, unit_price: 0, pieces_count: 1 })
                  const newIdx = itemFields.length
                  setNewItemIdx(newIdx)
                  setTimeout(() => {
                    selectRefs.current.get(newIdx)?.focus()
                    setNewItemIdx(null)
                  }, 100)
                }}
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

          {/* Cartes produits — pas de scroll horizontal */}
          <div className="space-y-2">
            {itemFields.map((field, idx) => {
              const qty = Number(watchedItems[idx]?.quantity) || 0
              const pieces = Number(watchedItems[idx]?.pieces_count) || 1
              const price = Number(watchedItems[idx]?.unit_price) || 0
              const selectedProductId = watchedItems[idx]?.product_id
              const productData = products.find(p => p.id === selectedProductId)
              const availableStock = productData?.stock?.quantity ?? 0
              const stockWarning = Boolean(selectedProductId) && qty > availableStock

              return (
                <div key={field.id} className="rounded-md border bg-background p-3 space-y-2">
                  {/* Ligne 1 : sélecteur produit + boutons */}
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 min-w-0">
                      {field.original_id ? (
                        <span className="text-sm font-medium">
                          {products.find(p => p.id === field.product_id)?.name || 'Produit inconnu'}
                        </span>
                      ) : (
                        <>
                          <Controller
                            name={`items.${idx}.product_id`}
                            control={control}
                            render={({ field: f }) => (
                              <select
                                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={f.value}
                                ref={el => {
                                  f.ref(el)
                                  if (el) selectRefs.current.set(idx, el)
                                  else selectRefs.current.delete(idx)
                                }}
                                autoFocus={newItemIdx === idx}
                                onChange={e => {
                                  f.onChange(e.target.value)
                                  handleProductChange(idx, e.target.value)
                                }}
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
                        </>
                      )}
                      {errors.items?.[idx]?.product_id && (
                        <p className="text-xs text-destructive mt-0.5">{errors.items[idx]?.product_id?.message}</p>
                      )}
                    </div>
                    {!field.original_id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        title="Nouveau produit"
                        onClick={() => setShowNewProductIdx(idx)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!field.original_id && itemFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Ligne 2 : Pièces | Quantité | P.U. | Sous-total */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Pièces</span>
                      <div className="text-sm text-center tabular-nums h-8 flex items-center justify-center">
                        {pieces}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Quantité</span>
                      {field.original_id ? (
                        <div className="text-sm text-center h-8 flex items-center justify-center">{field.quantity}</div>
                      ) : (
                        <Controller
                          name={`items.${idx}.quantity`}
                          control={control}
                          render={({ field: f }) => (
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-center text-sm px-1"
                              value={f.value}
                              onChange={e => f.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                              onFocus={e => e.target.select()}
                              ref={f.ref}
                            />
                          )}
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">P.U (MAD)</span>
                      <Controller
                        name={`items.${idx}.unit_price`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-right text-sm px-1"
                            onFocus={e => e.target.select()}
                            value={f.value ?? ''}
                            onChange={e => f.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            ref={f.ref}
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">S. Total</span>
                      <div className="text-sm font-medium text-right tabular-nums h-8 flex items-center justify-end">
                        {formatCurrency(qty * pieces * price)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Total produits */}
            <div className="flex justify-end pt-1 gap-2 text-sm">
              <span className="font-semibold text-muted-foreground">Total :</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
          </div>

          {typeof errors.items?.message === 'string' && (
            <p className="text-xs text-destructive">{errors.items.message}</p>
          )}
        </div>

        {/* ── Paiements ── */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Paiements</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendPayment({ date: today, amount: remaining > 0 ? remaining : 0, note: '', methode_paiement: '' })}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter un paiement
            </Button>
          </div>

          {/* Cartes paiements — pas de scroll horizontal */}
          {paymentFields.length > 0 && (
            <div className="space-y-2">
              {paymentFields.map((field, idx) => (
                <div key={field.id} className="rounded-md border bg-background p-3 space-y-2">
                  {/* Ligne 1 : Date + Montant + Supprimer */}
                  <div className="flex gap-2 items-end">
                    <div className="space-y-1 flex-1">
                      <span className="text-xs text-muted-foreground block">Date</span>
                      <Controller
                        name={`payments.${idx}.date`}
                        control={control}
                        render={({ field: f }) => (
                          <Input type="date" className="h-8" value={f.value} onChange={f.onChange} ref={f.ref} />
                        )}
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <span className="text-xs text-muted-foreground block">Montant (MAD)</span>
                      <Controller
                        name={`payments.${idx}.amount`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-right"
                            value={f.value}
                            onChange={e => f.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                            onFocus={e => e.target.select()}
                            ref={f.ref}
                          />
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removePayment(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Ligne 2 : Méthode + Note */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Méthode</span>
                      <Controller
                        name={`payments.${idx}.methode_paiement`}
                        control={control}
                        render={({ field: f }) => (
                          <select
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={f.value ?? ''}
                            onChange={f.onChange}
                            ref={f.ref}
                          >
                            <option value="">—</option>
                            <option value="Espèces">Espèces</option>
                            <option value="Virement bancaire">Virement</option>
                            <option value="Chèque">Chèque</option>
                            <option value="Effet">Effet</option>
                            <option value="Traite">Traite</option>
                            <option value="Carte bancaire">Carte</option>
                          </select>
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Note</span>
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
                    </div>
                  </div>
                </div>
              ))}
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
