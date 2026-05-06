import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, Building2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { useCompany, useUpsertCompany } from '@/hooks/useCompany'
import { cn } from '@/lib/utils'
import { DEFAULT_BRAND_COLOR } from '@/lib/constants'

// ── Schéma ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Nom obligatoire'),
  forme_juridique: z.string().optional().or(z.literal('')),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  site_web: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  ice: z.string().optional().or(z.literal('')),
  if_number: z.string().optional().or(z.literal('')),
  rc: z.string().optional().or(z.literal('')),
  tp_number: z.string().optional().or(z.literal('')),
  rib: z.string().optional().or(z.literal('')),
  taux_tva_defaut: z.number({ invalid_type_error: 'Entrer un taux' }).min(0).max(100).default(0),
  couleur_marque: z.string().min(1).default(DEFAULT_BRAND_COLOR),
})

type FormValues = z.infer<typeof schema>

// ── Masque téléphone marocain XX XX XX XX XX (UX_RULES §13) ──────────────────

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  return digits.match(/.{1,2}/g)?.join(' ') ?? digits
}

// ── Couleurs prédéfinies (Curated Professional Palette) ──────────────────────

const PRESET_COLORS = [
  { label: 'Indigo', value: DEFAULT_BRAND_COLOR },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Crimson', value: '#be123c' },
  { label: 'Violet', value: '#7c3aed' },
]

// ── Composant ─────────────────────────────────────────────────────────────────

export const SettingsPage = () => {
  const { data: company, isLoading } = useCompany()
  const upsert = useUpsertCompany()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'brand' | 'general' | 'legal' | 'billing'>('brand')

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: company?.name ?? '',
      forme_juridique: company?.forme_juridique ?? '',
      email: company?.email ?? '',
      phone: company?.phone ?? '',
      site_web: company?.site_web ?? '',
      address: company?.address ?? '',
      ice: company?.ice ?? '',
      if_number: company?.if_number ?? '',
      rc: company?.rc ?? '',
      tp_number: company?.tp_number ?? '',
      rib: company?.rib ?? '',
      taux_tva_defaut: company?.taux_tva_defaut ?? 0,
      couleur_marque: company?.couleur_marque ?? DEFAULT_BRAND_COLOR,
    },
  })

  const couleur = watch('couleur_marque')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setLogoError(null)
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoError('Format invalide — PNG ou JPG uniquement')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Fichier trop lourd — max 2 Mo')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (values: FormValues) => {
    await upsert.mutateAsync({
      ...values,
      forme_juridique: values.forme_juridique ?? '',
      email: values.email ?? '',
      phone: values.phone ?? '',
      site_web: values.site_web ?? '',
      address: values.address ?? '',
      ice: values.ice ?? '',
      if_number: values.if_number ?? '',
      rc: values.rc ?? '',
      tp_number: values.tp_number ?? '',
      rib: values.rib ?? '',
      logo_url: company?.logo_url ?? null,
      logoFile: logoFile ?? undefined,
    })
  }

  const currentLogo = logoPreview ?? company?.logo_url ?? null

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Paramètres"
        actions={
          <Button type="submit" form="settings-form" disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        }
      />

      <form id="settings-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

        {/* ── Onglets ── */}
        <div className="flex border-b mb-6 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            className={cn("py-2 px-4 border-b-2 text-sm font-medium whitespace-nowrap", activeTab === 'brand' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab('brand')}
          >
            Marque & Design
          </button>
          <button
            type="button"
            className={cn("py-2 px-4 border-b-2 text-sm font-medium whitespace-nowrap", activeTab === 'general' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab('general')}
          >
            Général
          </button>
          <button
            type="button"
            className={cn("py-2 px-4 border-b-2 text-sm font-medium whitespace-nowrap", activeTab === 'legal' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab('legal')}
          >
            Légal
          </button>
          <button
            type="button"
            className={cn("py-2 px-4 border-b-2 text-sm font-medium whitespace-nowrap", activeTab === 'billing' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab('billing')}
          >
            Facturation
          </button>
        </div>

        {/* ── Contenu des onglets ── */}
        <div className={activeTab === 'brand' ? 'block space-y-6' : 'hidden'}>
          {/* ── Logo ── */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Logo</h2>

            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted overflow-hidden shrink-0">
                {currentLogo ? (
                  <img src={currentLogo} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choisir un fichier
                </Button>
                <p className="text-xs text-muted-foreground">PNG ou JPG · max 2 Mo</p>
                {logoError && <p className="text-xs text-destructive">{logoError}</p>}
                {logoFile && <p className="text-xs text-green-600">{logoFile.name}</p>}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
          </section>
        </div>

        <div className={activeTab === 'general' ? 'block space-y-6' : 'hidden'}>
          {/* ── Informations entreprise ── */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Informations entreprise</h2>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom *</Label>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input id="name" {...field} placeholder="Nom de l'entreprise" />
                  )}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="forme_juridique">Forme juridique</Label>
                <Controller
                  control={control}
                  name="forme_juridique"
                  render={({ field }) => (
                    <Input id="forme_juridique" {...field} placeholder="SARL, SA, SAS..." />
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <Input id="email" type="email" {...field} placeholder="contact@entreprise.ma" />
                    )}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field }) => (
                      <Input
                        id="phone"
                        value={formatPhone(field.value ?? '')}
                        onChange={e => field.onChange(formatPhone(e.target.value))}
                        onBlur={field.onBlur}
                        placeholder="06 00 00 00 00"
                        maxLength={14}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="site_web">Site web</Label>
                <Controller
                  control={control}
                  name="site_web"
                  render={({ field }) => (
                    <Input id="site_web" {...field} placeholder="https://www.entreprise.ma" />
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Controller
                  control={control}
                  name="address"
                  render={({ field }) => (
                    <Input id="address" {...field} placeholder="Adresse complète" />
                  )}
                />
              </div>
            </div>
          </section>
        </div>

        <div className={activeTab === 'legal' ? 'block space-y-6' : 'hidden'}>
          {/* ── Identifiants légaux ── */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identifiants légaux</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ice">ICE</Label>
                <Controller
                  control={control}
                  name="ice"
                  render={({ field }) => (
                    <Input id="ice" {...field} placeholder="000 000 000 00000" />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="if_number">IF</Label>
                <Controller
                  control={control}
                  name="if_number"
                  render={({ field }) => (
                    <Input id="if_number" {...field} placeholder="Identifiant fiscal" />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc">RC</Label>
                <Controller
                  control={control}
                  name="rc"
                  render={({ field }) => (
                    <Input id="rc" {...field} placeholder="Registre de commerce" />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tp_number">TP</Label>
                <Controller
                  control={control}
                  name="tp_number"
                  render={({ field }) => (
                    <Input id="tp_number" {...field} placeholder="Taxe professionnelle" />
                  )}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="rib">RIB</Label>
                <Controller
                  control={control}
                  name="rib"
                  render={({ field }) => (
                    <Input id="rib" {...field} placeholder="MA64 0110 0000 0000 1234 5678 9" />
                  )}
                />
              </div>
            </div>
          </section>
        </div>

        <div className={activeTab === 'billing' ? 'block space-y-6' : 'hidden'}>
          {/* ── Préférences facturation ── */}
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Préférences facturation</h2>

            <div className="flex items-center gap-3">
              <div className="w-48 space-y-1.5">
                <Label htmlFor="taux_tva_defaut">Taux TVA par défaut (%)</Label>
                <Controller
                  control={control}
                  name="taux_tva_defaut"
                  render={({ field }) => (
                    <select
                      id="taux_tva_defaut"
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                      value={field.value}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    >
                      <option value={0}>0% (Hors TVA)</option>
                      <option value={7}>7%</option>
                      <option value={10}>10%</option>
                      <option value={14}>14%</option>
                      <option value={20}>20%</option>
                    </select>
                  )}
                />
                {errors.taux_tva_defaut && (
                  <p className="text-xs text-destructive">{errors.taux_tva_defaut.message}</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ── Couleur de marque ── */}
        <div className={activeTab === 'brand' ? 'block space-y-6' : 'hidden'}>
          <section className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Couleur de marque</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setValue('couleur_marque', c.value)}
                    className={cn(
                      'h-10 w-10 rounded-xl border-2 transition-all shadow-sm ring-offset-background',
                      couleur === c.value 
                        ? 'border-foreground scale-110 shadow-md ring-2 ring-ring ring-offset-2' 
                        : 'border-transparent hover:scale-105 hover:shadow-md'
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}

                {/* Picker libre — le bouton déclenche l'input color natif */}
                <div className="relative overflow-hidden rounded-xl border border-dashed border-muted-foreground/30 hover:border-primary transition-colors group">
                  <Button
                    type="button"
                    variant="ghost"
                    className="pointer-events-none h-10 px-3 gap-1.5 font-normal text-muted-foreground group-hover:text-primary transition-colors"
                    style={{ color: !PRESET_COLORS.find(c => c.value === couleur) ? couleur : undefined }}
                  >
                    <Palette className="h-4 w-4" />
                    <span className="text-xs">Libre</span>
                  </Button>
                  <Controller
                    control={control}
                    name="couleur_marque"
                    render={({ field }) => (
                      <input
                        type="color"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                        title="Choisir n'importe quelle couleur"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border" style={{ backgroundColor: couleur }} />
                <Controller
                  control={control}
                  name="couleur_marque"
                  render={({ field }) => (
                    <Input
                      {...field}
                      className="w-32 font-mono text-sm"
                      placeholder="#000000"
                      maxLength={7}
                    />
                  )}
                />
                <span className="text-sm text-muted-foreground">Aperçu</span>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  )
}





