import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, AlertTriangle, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { EntityAutocomplete } from '@/components/shared/EntityAutocomplete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useClients } from '@/hooks/useClients'
import { useProducts } from '@/hooks/useProducts'
import { useCompany } from '@/hooks/useCompany'
import { ClientModal } from '@/features/clients/ClientModal'
import { ProductModal } from '@/features/products/ProductModal'
import { formatCurrency, getPaymentStatus, toISODate } from '@/lib/utils'
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
  note: z.string().optional().or(z.literal('')),
  tva_rate: z.number().default(0),
  items: z.array(itemSchema).min(1, 'Ajouter au moins un produit'),
  payments: z.array(paymentSchema),
})

export type SaleFormValues = z.infer<typeof saleSchema>

// ── Badge statut ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Payé</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  if (status === 'cancelled') return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">⛔ Annulé</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SaleFormProps {
  id?: string
  existing?: Sale
  onSubmit: (values: SaleFormValues) => Promise<void>
  hasInvoice?: boolean
  savedPayments?: Array<{ id: string }>
}

// ── Composant principal ───────────────────────────────────────────────────────

export const SaleForm = ({ id, existing, onSubmit, hasInvoice = false, savedPayments }: SaleFormProps) => {
  const navigate = useNavigate()
  const today = toISODate(new Date())

  const hasExistingPayments =
    existing && existing.client_payments && existing.client_payments.length > 0

  const [showNewClient, setShowNewClient] = useState(false)
  const [showNewProductIdx, setShowNewProductIdx] = useState<number | null>(null)
  const [expandedInfo, setExpandedInfo] = useState(true)
  const [expandedProducts, setExpandedProducts] = useState(true)
  const [expandedPayments, setExpandedPayments] = useState(true)

  const { data: clients = [] } = useClients()
  const { data: products = [] } = useProducts()
  const { data: company } = useCompany()

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
      note: existing?.note ?? '',
      tva_rate: existing?.tva_rate ?? 0,
      items: defaultItems,
      payments: defaultPayments,
    },
  })

  useEffect(() => {
    if (!existing && company != null) {
      setValue('tva_rate', company.taux_tva_defaut ?? 0)
    }
  }, [existing, company, setValue])



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
  const watchedTvaRate = watch('tva_rate')

  const totalHT = watchedItems?.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.pieces_count) || 1) * (Number(i.unit_price) || 0),
    0
  ) || 0
  const tvaAmount = totalHT * (Number(watchedTvaRate) || 0) / 100
  const totalTTC = totalHT + tvaAmount
  const paid = watchedPayments?.reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0
  const remaining = totalTTC - paid
  const status = getPaymentStatus(paid, totalTTC)

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

  const isCancelled = existing?.status === 'cancelled'

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

      <form id={id} onSubmit={isCancelled ? e => e.preventDefault() : handleSubmit(onSubmit)} noValidate className="space-y-8">
        {isCancelled && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
            <span>⛔</span>
            <span>Vente annulée — consultation uniquement, aucune modification possible.</span>
          </div>
        )}
        <fieldset disabled={isCancelled} className="contents">
        {hasInvoice && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <span className="font-semibold">Facture générée</span> — Seule la section Paiements reste modifiable.
          </div>
        )}

        {/* ── Entête ── */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div
            className={`flex items-center justify-between p-4 sm:p-6 pb-2 sm:pb-3 transition-colors ${!expandedInfo ? 'cursor-pointer hover:bg-muted/50' : ''}`}
            onClick={!expandedInfo ? () => setExpandedInfo(true) : undefined}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              Informations
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                if (expandedInfo) {
                  e.stopPropagation()
                  setExpandedInfo(false)
                } else {
                  setExpandedInfo(true)
                }
              }}
            >
              {expandedInfo ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>

          {expandedInfo && (
            <div className="p-4 sm:p-6 pt-2 sm:pt-3 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
            {/* Client */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Client <span className="text-destructive">*</span></Label>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <EntityAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    options={clients.map(c => ({ id: c.id, label: c.name }))}
                    placeholder="Rechercher un client..."
                    onAddNew={!hasInvoice ? () => setShowNewClient(true) : undefined}
                    disabled={hasInvoice}
                    size="md"
                    errorMessage="Sélectionnez un client ou utilisez + pour en créer un"
                  />
                )}
              />
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
                  <Input type="date" value={field.value} onChange={field.onChange} ref={field.ref} disabled={hasInvoice} />
                )}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            {/* Référence */}
            <div className="space-y-1.5">
              <Label>Référence</Label>
              <Input
                readOnly
                value={existing?.reference ?? ''}
                placeholder="Généré à l'enregistrement"
                className="font-mono bg-muted text-muted-foreground cursor-default"
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Note</Label>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <Input placeholder="Note interne (optionnel)" value={field.value ?? ''} onChange={field.onChange} ref={field.ref} disabled={hasInvoice} />
                )}
              />
            </div>
          </div>
          </div>
          )}
        </div>

        {/* ── Produits ── */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div
            className={`flex items-center justify-between p-4 sm:p-6 pb-2 sm:pb-3 transition-colors ${!expandedProducts ? 'cursor-pointer hover:bg-muted/50' : ''}`}
            onClick={!expandedProducts ? () => setExpandedProducts(true) : undefined}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produits</h2>
            <div className="flex items-center gap-2">
              {expandedProducts && !hasExistingPayments && !hasInvoice && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    appendItem({ product_id: '', quantity: 1, unit_price: 0, pieces_count: 1 })
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedProducts(!expandedProducts)
                }}
              >
                {expandedProducts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>

          {expandedProducts && (
            <div className="p-4 sm:p-6 pt-2 sm:pt-3 space-y-3">

          {hasExistingPayments && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
              ⚠️ Des paiements ont été enregistrés — les lignes produits ne sont plus modifiables.
            </p>
          )}

          {/* Produits — cartes mobile / lignes desktop */}
          <div className="space-y-2 sm:space-y-0">
            {/* En-tête colonnes — desktop uniquement */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_60px_90px_140px_120px_40px] gap-2 px-1 pb-2 border-b text-xs font-medium text-muted-foreground">
              <span>Produit</span>
              <span className="text-center">Pièces</span>
              <span className="text-center">Quantité</span>
              <span className="text-right">Prix Unitaire HT</span>
              <span className="text-right">Sous-Total</span>
              <span></span>
            </div>

            {itemFields.map((field, idx) => {
              const qty = Number(watchedItems[idx]?.quantity) || 0
              const pieces = Number(watchedItems[idx]?.pieces_count) || 1
              const price = Number(watchedItems[idx]?.unit_price) || 0
              const selectedProductId = watchedItems[idx]?.product_id
              const productData = products.find(p => p.id === selectedProductId)
              const availableStock = productData?.stock?.quantity ?? 0
              const stockWarning = Boolean(selectedProductId) && qty > availableStock

              return (
                <div
                  key={field.id}
                  className="rounded-md border bg-card p-3 space-y-2 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:last:border-b-0 sm:bg-transparent sm:p-0 sm:py-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_60px_90px_140px_120px_40px] sm:gap-2 sm:items-start"
                >
                  {/* Col 1 / Ligne 1 mobile : produit + boutons mobile */}
                  <div className="flex gap-2 items-start sm:items-center">
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
                              <EntityAutocomplete
                                value={f.value}
                                onChange={id => {
                                  f.onChange(id)
                                  handleProductChange(idx, id)
                                }}
                                options={products.map(p => ({ id: p.id, label: p.name }))}
                                placeholder="Rechercher un produit..."
                                onAddNew={() => setShowNewProductIdx(idx)}

                                size="sm"
                                errorMessage="Sélectionnez un produit ou utilisez + pour en créer un"
                              />
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
                    {/* Boutons — mobile uniquement (le + est intégré dans l'autocomplete) */}
                    <div className="flex gap-1 sm:hidden">
                      {!field.original_id && itemFields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Cols 2-5 (desktop) / Ligne 2 (mobile) : Pièces, Qté, P.U., Sous-total */}
                  <div className="grid grid-cols-[44px_1fr_1fr_1.4fr] gap-2 mt-2 sm:mt-0 sm:contents">
                    <div className="space-y-1 sm:space-y-0">
                      <span className="text-xs text-muted-foreground block sm:hidden">Pièces</span>
                      <div className="text-sm text-center tabular-nums h-8 flex items-center justify-center">
                        {pieces}
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-0">
                      <span className="text-xs text-muted-foreground block sm:hidden">Quantité</span>
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
                    <div className="space-y-1 sm:space-y-0">
                      <span className="text-xs text-muted-foreground block sm:hidden">P.U. HT</span>
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
                            disabled={hasInvoice}
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-0 sm:h-8 sm:flex sm:items-center sm:justify-end">
                      <span className="text-xs text-muted-foreground block sm:hidden">S. Total</span>
                      <div className="text-sm font-medium tabular-nums h-8 flex items-center justify-end">
                        {formatCurrency(qty * pieces * price).replace(' MAD', '')}
                      </div>
                    </div>
                  </div>

                  {/* Col 6 (desktop) : boutons d'action */}
                  <div className="hidden sm:flex items-center justify-end">
                    {!field.original_id && itemFields.length > 1 && !hasInvoice && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Récapitulatif financier */}
            <div className="flex flex-col items-end pt-3 border-t text-sm">
              <div className="grid grid-cols-[auto_130px] gap-x-4 gap-y-2 items-center">
                <span className="text-muted-foreground text-right">Total HT :</span>
                <span className="font-semibold text-right">{formatCurrency(totalHT)}</span>
                
                <div className="col-span-2 border-t border-dashed my-1 opacity-50" />

                <span className="text-muted-foreground text-right">Taux TVA :</span>
                <Controller
                  name="tva_rate"
                  control={control}
                  render={({ field }) => (
                    <select
                      className="h-8 w-full rounded-md border border-input px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed bg-background"
                      value={field.value}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                      disabled={hasInvoice}
                    >
                      <option value={0}>0%</option>
                      <option value={7}>7%</option>
                      <option value={10}>10%</option>
                      <option value={14}>14%</option>
                      <option value={20}>20%</option>
                    </select>
                  )}
                />

                {watchedTvaRate > 0 && (
                  <>
                    <span className="text-muted-foreground text-right whitespace-nowrap">TVA ({watchedTvaRate}%) :</span>
                    <span className="font-semibold text-right">{formatCurrency(tvaAmount)}</span>
                  </>
                )}

                <div className="col-span-2 border-t pt-2 mt-1 grid grid-cols-[auto_130px] gap-x-4 items-center">
                  <span className="font-bold text-base text-right whitespace-nowrap">Total TTC :</span>
                  <span className="font-bold text-base text-right">{formatCurrency(totalTTC)}</span>
                </div>
              </div>
            </div>
          </div>

          {typeof errors.items?.message === 'string' && (
            <p className="text-xs text-destructive">{errors.items.message}</p>
          )}
          </div>
          )}
        </div>



        {/* ── Paiements ── */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div
            className={`flex items-center justify-between p-4 sm:p-6 pb-2 sm:pb-3 transition-colors ${!expandedPayments ? 'cursor-pointer hover:bg-muted/50' : ''}`}
            onClick={!expandedPayments ? () => setExpandedPayments(true) : undefined}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Paiements</h2>
            <div className="flex items-center gap-2">
              {expandedPayments && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    appendPayment({ date: today, amount: remaining > 0 ? remaining : 0, note: '', methode_paiement: '' })
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ajouter un paiement
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedPayments(!expandedPayments)
                }}
              >
                {expandedPayments ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>

          {expandedPayments && (
            <div className="p-4 sm:p-6 pt-2 sm:pt-3 space-y-3">

          {/* Cartes paiements — pas de scroll horizontal */}
          {paymentFields.length > 0 && (
            <div className="space-y-2">
              {paymentFields.map((field, idx) => (
                <div key={field.id} className="rounded-md border p-3 space-y-2">
                  {/* Ligne 1 : Date + Montant + Supprimer */}
                  <div className="grid grid-cols-[1.1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Date</span>
                      <Controller
                        name={`payments.${idx}.date`}
                        control={control}
                        render={({ field: f }) => (
                          <Input type="date" className="h-8 px-1 text-xs sm:text-sm" value={f.value} onChange={f.onChange} ref={f.ref} />
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block truncate">Montant</span>
                      <Controller
                        name={`payments.${idx}.amount`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-right px-1 text-xs sm:text-sm"
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

                  {/* Ligne 2 : Mode + Note */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Mode</span>
                      <Controller
                        name={`payments.${idx}.methode_paiement`}
                        control={control}
                        render={({ field: f }) => (
                          <select
                            className="flex h-8 w-full rounded-md border border-input px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

                  {savedPayments?.[idx] && (
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => navigate(`/sales/${existing!.id}/payments/${savedPayments[idx].id}/receipt`)}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Aperçu reçu
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Récapitulatif financier */}
          <div className="flex flex-col items-end gap-1 border-t pt-4 text-sm">
            <div className="flex gap-8">
              <span className="text-muted-foreground">Total TTC :</span>
              <span className="font-semibold w-32 text-right">{formatCurrency(totalTTC)}</span>
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
          )}
        </div>
        </fieldset>
      </form>
    </>
  )
}
