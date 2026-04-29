import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers'
import { useProducts, useCreateProduct } from '@/hooks/useProducts'
import { SupplierForm, type SupplierFormValues } from '@/features/suppliers/SupplierForm'
import { formatCurrency, getPaymentStatus, toISODate } from '@/lib/utils'
import type { Purchase } from '@/types'

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  product_id: z.string().min(1, 'Choisir un produit'),
  quantity: z.number({ invalid_type_error: 'Entrer une quantité' }).min(1, 'Min 1'),
  unit_price: z.number({ invalid_type_error: 'Entrer un prix' }).min(0),
})

const paymentSchema = z.object({
  date: z.string().min(1, 'Date obligatoire'),
  amount: z.number({ invalid_type_error: 'Entrer un montant' }).min(0),
  note: z.string().optional().or(z.literal('')),
})

export const purchaseSchema = z.object({
  supplier_id: z.string().min(1, 'Fournisseur obligatoire'),
  date: z.string().min(1, 'Date obligatoire'),
  reference: z.string().optional().or(z.literal('')),
  note: z.string().optional().or(z.literal('')),
  items: z.array(itemSchema).min(1, 'Ajouter au moins un produit'),
  payments: z.array(paymentSchema),
})

export type PurchaseFormValues = z.infer<typeof purchaseSchema>

// ── Badge statut ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Payé</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PurchaseFormProps {
  /** Achat existant pour l'édition */
  existing?: Purchase
  onSubmit: (values: PurchaseFormValues) => Promise<void>
  isLoading?: boolean
}

// ── Composant principal ───────────────────────────────────────────────────────

export const PurchaseForm = ({ existing, onSubmit, isLoading = false }: PurchaseFormProps) => {
  const navigate = useNavigate()
  const today = toISODate(new Date())

  // Mode édition avec paiements → lignes produits non modifiables
  const hasExistingPayments =
    existing && existing.supplier_payments && existing.supplier_payments.length > 0
  const isEditMode = Boolean(existing)

  // Modales création rapide
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [showNewProduct, setShowNewProduct] = useState(false)

  const { data: suppliers = [] } = useSuppliers()
  const { data: products = [] } = useProducts()
  const createSupplier = useCreateSupplier()
  const createProduct = useCreateProduct()

  // Valeurs par défaut pour l'édition
  const defaultItems = existing?.purchase_items?.map(i => ({
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
  })) ?? [{ product_id: '', quantity: 1, unit_price: 0 }]

  const defaultPayments = existing?.supplier_payments?.map(p => ({
    date: p.date,
    amount: p.amount,
    note: p.note ?? '',
  })) ?? []

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplier_id: existing?.supplier_id ?? '',
      date: existing?.date ?? today,
      reference: existing?.reference ?? '',
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

  // Calculs en temps réel
  const watchedItems = watch('items')
  const watchedPayments = watch('payments')

  const total = watchedItems.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0
  )
  const paid = watchedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const remaining = total - paid
  const status = getPaymentStatus(paid, total)

  // Création rapide fournisseur
  const handleQuickSupplier = useCallback(
    async (values: SupplierFormValues) => {
      await createSupplier.mutateAsync({
        name: values.name,
        phone: values.phone || null,
        address: values.address || null,
        ice: values.ice || null,
      })
      setShowNewSupplier(false)
    },
    [createSupplier]
  )

  // Création rapide produit (minimal)
  const handleQuickProduct = useCallback(async () => {
    const name = window.prompt('Nom du produit :')
    if (!name?.trim()) return
    await createProduct.mutateAsync({
      name: name.trim(),
      type: 'individual',
      pieces_count: 1,
      stock_alert: 0,
    })
    setShowNewProduct(false)
  }, [createProduct])

  return (
    <>
      {/* Modale création rapide fournisseur */}
      <Dialog open={showNewSupplier} onOpenChange={setShowNewSupplier}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau fournisseur</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={handleQuickSupplier}
            onCancel={() => setShowNewSupplier(false)}
            isLoading={createSupplier.isPending}
          />
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
        {/* ── Entête ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Informations</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Fournisseur */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Fournisseur <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Controller
                  name="supplier_id"
                  control={control}
                  render={({ field }) => (
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={field.value}
                      onChange={field.onChange}
                      ref={field.ref}
                    >
                      <option value="">— Choisir un fournisseur —</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setShowNewSupplier(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.supplier_id && (
                <p className="text-xs text-destructive">{errors.supplier_id.message}</p>
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

            {/* Référence */}
            <div className="space-y-1.5">
              <Label>Référence</Label>
              <Controller
                name="reference"
                control={control}
                render={({ field }) => (
                  <Input placeholder="ACH-001 (optionnel)" value={field.value ?? ''} onChange={field.onChange} ref={field.ref} />
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
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produits</h2>
            {!hasExistingPayments && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  appendItem({ product_id: '', quantity: 1, unit_price: 0 })
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
                            <Controller
                              name={`items.${idx}.product_id`}
                              control={control}
                              render={({ field: f }) => (
                                <select
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  value={f.value}
                                  onChange={f.onChange}
                                  ref={f.ref}
                                >
                                  <option value="">— Produit —</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              )}
                            />
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
          {errors.items?.root && (
            <p className="text-xs text-destructive">{errors.items.root.message}</p>
          )}
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
