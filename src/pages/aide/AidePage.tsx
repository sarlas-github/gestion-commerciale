import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  FileText,
  BarChart3,
  Activity,
  BookOpen,
  Truck,
  Clock,
  AlertTriangle,
  Users,
  Layers,
  Cog,
  ChevronDown,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

// ─── Primitives ────────────────────────────────────────────────────────────────

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="flex-1 text-base font-semibold text-foreground">{title}</h2>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

const Note = ({ type, children }: { type: 'info' | 'warn' | 'ok'; children: React.ReactNode }) => (
  <div className={cn('rounded-lg border p-3.5 text-sm flex gap-2.5 leading-relaxed', {
    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300': type === 'info',
    'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300': type === 'warn',
    'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300': type === 'ok',
  })}>
    <span className="shrink-0 mt-0.5">{type === 'info' ? '💡' : type === 'warn' ? '⚠️' : '✅'}</span>
    <span>{children}</span>
  </div>
)

const Steps = ({ items }: { items: { title: string; desc: string }[] }) => (
  <div className="space-y-2">
    {items.map((item, i) => (
      <div key={i} className="flex gap-3 rounded-lg border bg-muted/40 p-3.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
          {i + 1}
        </span>
        <div>
          <p className="font-medium text-foreground text-sm mb-0.5">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.desc}</p>
        </div>
      </div>
    ))}
  </div>
)

const RulesTable = ({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50">
          {headers.map((h, i) => <th key={i} className="px-4 py-2.5 text-left font-semibold text-foreground">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
            {row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-muted-foreground">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const StatusBadge = ({ type }: { type: 'paid' | 'partial' | 'unpaid' | 'cancelled' }) => {
  const map = {
    paid:      { label: '🟢 Payé',    cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    partial:   { label: '🟡 Partiel', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    unpaid:    { label: '🔴 Impayé',  cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    cancelled: { label: '⛔ Annulé',  cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  }
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', map[type].cls)}>{map[type].label}</span>
}

const KpiGrid = ({
  items,
}: {
  items: { icon: React.ElementType; label: string; desc: string }[]
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {items.map((kpi, i) => (
      <div key={i} className="rounded-lg border bg-muted/40 p-4 space-y-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <kpi.icon className="h-4 w-4 text-primary" />
        </div>
        <p className="font-semibold text-foreground text-sm">{kpi.label}</p>
        <p className="text-xs text-muted-foreground leading-snug">{kpi.desc}</p>
      </div>
    ))}
  </div>
)

// ─── Guide Revente ──────────────────────────────────────────────────────────────

const GuideRevente = () => (
  <div className="space-y-4">

    <Section icon={LayoutDashboard} title="Votre tableau de bord">
      <p className="text-sm text-muted-foreground">Dès la connexion, le tableau de bord vous donne une vue complète de votre activité. En un coup d'œil, vous savez exactement où en est votre entreprise.</p>
      <KpiGrid items={[
        { icon: TrendingUp,    label: 'Chiffre d\'affaires',    desc: 'Ventes du mois, comparées au mois précédent.' },
        { icon: ShoppingCart,  label: 'Achats du mois',         desc: 'Total des approvisionnements fournisseurs.' },
        { icon: Clock,         label: 'Impayés clients',        desc: 'Montant total dû par vos clients.' },
        { icon: AlertTriangle, label: 'Alertes stock',          desc: 'Produits en rupture ou sous le seuil critique.' },
        { icon: Truck,         label: 'Fournisseurs impayés',   desc: 'Nombre de fournisseurs avec un solde dû.' },
      ]} />
      <p className="text-sm text-muted-foreground">Changez le mois en haut de l'écran pour consulter n'importe quelle période passée.</p>
    </Section>

    <Section icon={Package} title="Produits et stock">
      <p className="text-sm text-muted-foreground">Votre catalogue centralise tous vos produits avec leur stock en temps réel. À chaque achat ou vente, le stock se met à jour automatiquement — sans saisie manuelle de votre part.</p>
      <RulesTable
        headers={['Indicateur', 'Signification']}
        rows={[
          ['🟢 OK', 'Stock suffisant'],
          ['🟠 Faible', 'Stock au niveau ou en dessous du seuil d\'alerte'],
          ['🔴 Rupture', 'Stock à zéro'],
        ]}
      />
      <p className="text-sm text-muted-foreground">Les produits en alerte sont visibles directement depuis le menu de navigation. Vous pouvez corriger un stock manuellement depuis la fiche produit (inventaire, perte) — chaque correction est tracée.</p>
    </Section>

    <Section icon={ShoppingCart} title="Fournisseurs et achats">
      <p className="text-sm text-muted-foreground">Gérez vos fournisseurs et enregistrez vos approvisionnements. Chaque achat met à jour le stock et suit automatiquement ce que vous devez encore payer.</p>
      <Steps items={[
        { title: 'Choisissez le fournisseur', desc: 'Sélectionnez dans la liste, ou créez-en un nouveau directement depuis le formulaire.' },
        { title: 'Ajoutez les produits achetés', desc: 'Quantité et prix d\'achat pour chaque article. Le total se calcule automatiquement.' },
        { title: 'Indiquez ce que vous avez déjà payé (optionnel)', desc: 'Si vous avez versé un acompte, saisissez le montant.' },
        { title: 'Validez', desc: 'Le stock est mis à jour instantanément.' },
      ]} />
      <RulesTable
        headers={['Statut', 'Signification']}
        rows={[
          [<StatusBadge type="unpaid" />, 'Aucun paiement enregistré'],
          [<StatusBadge type="partial" />, 'Paiement partiel effectué'],
          [<StatusBadge type="paid" />, 'Achat intégralement réglé'],
          [<StatusBadge type="cancelled" />, 'Achat annulé, stock remis en état'],
        ]}
      />
      <p className="text-sm text-muted-foreground">Depuis la fiche d'un fournisseur, consultez l'historique complet de vos échanges : achats, paiements versés et solde restant dû.</p>
    </Section>

    <Section icon={TrendingUp} title="Clients et ventes">
      <p className="text-sm text-muted-foreground">Enregistrez vos ventes en quelques secondes. L'application génère automatiquement la facture, déduit le stock, et garde une trace de tout ce que vos clients vous doivent.</p>
      <Steps items={[
        { title: 'Choisissez le client', desc: 'Sélectionnez dans la liste, ou créez-en un nouveau directement depuis le formulaire.' },
        { title: 'Ajoutez les produits vendus', desc: 'Le prix de vente habituel est pré-rempli. Ajustez si besoin.' },
        { title: 'Indiquez ce que le client a déjà payé (optionnel)', desc: 'Si un acompte a été versé, saisissez le montant.' },
        { title: 'Validez', desc: 'La vente est enregistrée, le stock mis à jour, et la facture générée automatiquement.' },
      ]} />
      <RulesTable
        headers={['Statut', 'Signification']}
        rows={[
          [<StatusBadge type="unpaid" />, 'Aucun paiement reçu'],
          [<StatusBadge type="partial" />, 'Paiement partiel reçu'],
          [<StatusBadge type="paid" />, 'Vente intégralement réglée'],
          [<StatusBadge type="cancelled" />, 'Vente annulée, stock remis en état'],
        ]}
      />
      <p className="text-sm text-muted-foreground">Depuis la fiche d'un client, consultez toutes ses ventes, ses paiements, et le total qu'il vous doit encore.</p>
    </Section>

    <Section icon={FileText} title="Factures et paiements">
      <p className="text-sm text-muted-foreground">Chaque vente génère automatiquement une facture numérotée. Chaque paiement reçu génère automatiquement un reçu. Vous n'avez rien à faire manuellement.</p>
      <RulesTable
        headers={['Document', 'Numérotation', 'Généré quand ?']}
        rows={[
          ['Facture', 'FAC-2026-001', 'Automatiquement à chaque vente'],
          ['Reçu de paiement', 'REC-2026-001', 'Automatiquement à chaque règlement client'],
        ]}
      />
      <Note type="ok">Documents fiables et immuables. Une facture conserve toujours les informations exactes du moment de sa génération — coordonnées de votre entreprise, données du client, montants — même si ces informations sont modifiées par la suite.</Note>
      <p className="text-sm text-muted-foreground">Les paiements partiels sont supportés : enregistrez plusieurs règlements sur une même vente ou un même achat. Le statut se met à jour à chaque fois.</p>
    </Section>

    <Section icon={BarChart3} title="Rapports et états">
      <p className="text-sm text-muted-foreground">Les rapports vous donnent une vision claire de votre situation financière sur n'importe quelle période.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground text-sm">État clients</p>
          </div>
          <p className="text-sm text-muted-foreground">Total des ventes, montant encaissé et reste à encaisser par client. Identifiez qui vous doit quoi en un coup d'œil.</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground text-sm">État fournisseurs</p>
          </div>
          <p className="text-sm text-muted-foreground">Total des achats, montant réglé et solde restant dû par fournisseur. Ne laissez plus passer un règlement.</p>
        </div>
      </div>
      <Note type="info">Ces états peuvent couvrir une période longue (plusieurs mois ou toute l'année) pour une vue complète de vos relations commerciales.</Note>
    </Section>

    <Section icon={Activity} title="Historique des mouvements de stock">
      <p className="text-sm text-muted-foreground">Chaque entrée et sortie de stock est enregistrée automatiquement. Retrouvez, pour chaque produit, l'historique complet : quelle vente a consommé quoi, quel achat a réapprovisionné quoi. Chaque ligne affiche le <strong className="text-foreground">stock avant</strong> et le <strong className="text-foreground">stock après</strong> le mouvement.</p>
      <Note type="info">Le stock actuel d'un produit correspond toujours au stock après de son dernier mouvement enregistré.</Note>
    </Section>

    <Section icon={BookOpen} title="Règles à connaître">
      <p className="text-sm font-medium text-foreground">Modification et annulation d'une vente</p>
      <RulesTable
        headers={['Situation', 'Modifier', 'Annuler']}
        rows={[
          ['Vente créée, sans facture ni paiement', '✅ Oui', '✅ Oui'],
          ['Facture générée', '❌ Non', '❌ Non'],
          ['Paiement enregistré', '❌ Non', '❌ Non'],
          ['Vente annulée', '❌ Non', '—'],
        ]}
      />
      <p className="text-xs text-muted-foreground">Ces restrictions protègent la cohérence de vos documents comptables.</p>
      <p className="text-sm font-medium text-foreground mt-2">Modification et annulation d'un achat</p>
      <RulesTable
        headers={['Situation', 'Modifier', 'Annuler']}
        rows={[
          ['Achat créé, sans paiement', '✅ Oui', '✅ Oui'],
          ['Paiement enregistré', '✅ Oui', '❌ Non'],
          ['Achat annulé', '❌ Non', '—'],
        ]}
      />
    </Section>

  </div>
)

// ─── Guide Production ───────────────────────────────────────────────────────────

const GuideProduction = () => (
  <div className="space-y-4">

    <Section icon={LayoutDashboard} title="Votre tableau de bord">
      <p className="text-sm text-muted-foreground">Dès la connexion, le tableau de bord vous donne une vue complète de votre activité. En un coup d'œil, vous savez exactement où en est votre entreprise.</p>
      <KpiGrid items={[
        { icon: TrendingUp,    label: 'Chiffre d\'affaires',    desc: 'Ventes du mois, comparées au mois précédent.' },
        { icon: ShoppingCart,  label: 'Achats du mois',         desc: 'Total des approvisionnements en matières premières.' },
        { icon: Clock,         label: 'Impayés clients',        desc: 'Montant total dû par vos clients.' },
        { icon: AlertTriangle, label: 'Alertes stock',          desc: 'Matières premières et produits finis en alerte.' },
        { icon: Truck,         label: 'Fournisseurs impayés',   desc: 'Nombre de fournisseurs avec un solde dû.' },
      ]} />
      <p className="text-sm text-muted-foreground">Changez le mois en haut de l'écran pour consulter n'importe quelle période passée.</p>
    </Section>

    <Section icon={Package} title="Votre catalogue de produits">
      <p className="text-sm text-muted-foreground">Votre catalogue distingue deux types de produits, chacun avec son propre stock suivi en temps réel.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">Matières premières</p>
          </div>
          <p className="text-sm text-muted-foreground">Ce que vous achetez pour fabriquer.</p>
          <p className="text-xs text-muted-foreground/70">Farine, tissu, métal, huile, bois…</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-green-700 dark:text-green-400" />
            <p className="font-semibold text-sm text-green-900 dark:text-green-200">Produits finis</p>
          </div>
          <p className="text-sm text-muted-foreground">Ce que vous vendez à vos clients.</p>
          <p className="text-xs text-muted-foreground/70">Pain, vêtement, meuble, conserve…</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Les stocks se mettent à jour automatiquement à chaque achat, vente ou déclaration de production. Les produits en alerte sont visibles directement depuis le menu de navigation.</p>
    </Section>

    <Section icon={ShoppingCart} title="Achats de matières premières">
      <p className="text-sm text-muted-foreground">Enregistrez vos approvisionnements. Chaque achat augmente automatiquement le stock des matières premières concernées.</p>
      <Steps items={[
        { title: 'Choisissez le fournisseur', desc: 'Sélectionnez dans la liste, ou créez-en un nouveau directement depuis le formulaire.' },
        { title: 'Ajoutez les matières premières achetées', desc: 'Quantité et prix d\'achat pour chaque article.' },
        { title: 'Indiquez ce que vous avez déjà payé (optionnel)', desc: 'Si un acompte a été versé, saisissez le montant.' },
        { title: 'Validez', desc: 'Le stock des matières premières est mis à jour instantanément.' },
      ]} />
      <p className="text-sm text-muted-foreground">Depuis la fiche d'un fournisseur, consultez l'historique complet de vos échanges : achats, paiements versés et solde restant dû.</p>
    </Section>

    <Section icon={Cog} title="Déclarer votre production">
      <p className="text-sm text-muted-foreground">L'application vous accompagne dans le suivi de votre cycle complet :</p>
      <div className="flex items-center gap-2 flex-wrap rounded-lg border bg-muted/40 p-4">
        <div className="flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1.5 text-xs font-medium">
          <ShoppingCart className="h-3.5 w-3.5" /> Achat matières premières
        </div>
        <span className="text-muted-foreground text-lg">→</span>
        <div className="flex items-center gap-1.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 px-3 py-1.5 text-xs font-medium">
          <Cog className="h-3.5 w-3.5" /> Déclaration de production
        </div>
        <span className="text-muted-foreground text-lg">→</span>
        <div className="flex items-center gap-1.5 rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 text-xs font-medium">
          <TrendingUp className="h-3.5 w-3.5" /> Vente produits finis
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Lorsque vous fabriquez, déclarez deux choses depuis la page <strong className="text-foreground">Mouvements stock</strong> :</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">Consommation</p>
          </div>
          <p className="text-sm text-muted-foreground">Les matières premières utilisées. Leur stock diminue.</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-700 dark:text-green-400" />
            <p className="font-semibold text-sm text-green-900 dark:text-green-200">Production</p>
          </div>
          <p className="text-sm text-muted-foreground">Les produits finis fabriqués. Leur stock augmente.</p>
        </div>
      </div>
      <Steps items={[
        { title: 'Allez dans Mouvements stock', desc: 'Cliquez sur "Déclarer Consommation" ou "Déclarer Production".' },
        { title: 'Sélectionnez le produit et la quantité', desc: 'Matière première consommée, ou produit fini fabriqué.' },
        { title: 'Ajoutez une note si besoin', desc: 'Numéro de lot, référence de fabrication, etc.' },
        { title: 'Validez', desc: 'Le stock est mis à jour et le mouvement tracé dans l\'historique.' },
      ]} />
      <Note type="info"><strong>Exemple :</strong> vous produisez 50 pains avec 10 kg de farine. Déclarez d'abord une Consommation de Farine (−10 kg), puis une Production de Pain (+50 pièces). Les deux stocks sont mis à jour instantanément.</Note>
    </Section>

    <Section icon={TrendingUp} title="Ventes">
      <p className="text-sm text-muted-foreground">Enregistrez vos ventes de produits finis. L'application génère automatiquement la facture, déduit le stock et garde une trace de tout ce que vos clients vous doivent.</p>
      <Steps items={[
        { title: 'Choisissez le client', desc: 'Sélectionnez dans la liste, ou créez-en un nouveau directement depuis le formulaire.' },
        { title: 'Ajoutez les produits vendus', desc: 'Le prix de vente habituel est pré-rempli. Ajustez si besoin.' },
        { title: 'Indiquez ce que le client a déjà payé (optionnel)', desc: 'Si un acompte a été versé, saisissez le montant.' },
        { title: 'Validez', desc: 'Vente enregistrée, stock déduit, facture générée automatiquement.' },
      ]} />
      <RulesTable
        headers={['Statut', 'Signification']}
        rows={[
          [<StatusBadge type="unpaid" />, 'Aucun paiement reçu'],
          [<StatusBadge type="partial" />, 'Paiement partiel reçu'],
          [<StatusBadge type="paid" />, 'Vente intégralement réglée'],
          [<StatusBadge type="cancelled" />, 'Vente annulée, stock remis en état'],
        ]}
      />
      <p className="text-sm text-muted-foreground">Depuis la fiche d'un client, consultez toutes ses ventes, ses paiements, et le total qu'il vous doit encore.</p>
    </Section>

    <Section icon={FileText} title="Factures et paiements">
      <p className="text-sm text-muted-foreground">Chaque vente génère automatiquement une facture numérotée. Chaque paiement reçu génère automatiquement un reçu. Vous n'avez rien à faire manuellement.</p>
      <RulesTable
        headers={['Document', 'Numérotation', 'Généré quand ?']}
        rows={[
          ['Facture', 'FAC-2026-001', 'Automatiquement à chaque vente'],
          ['Reçu de paiement', 'REC-2026-001', 'Automatiquement à chaque règlement client'],
        ]}
      />
      <Note type="ok">Documents fiables et immuables. Une facture conserve toujours les informations exactes du moment de sa génération, même si vos coordonnées ou celles du client changent par la suite.</Note>
      <p className="text-sm text-muted-foreground">Les paiements partiels sont supportés. Le statut se met à jour automatiquement à chaque règlement.</p>
    </Section>

    <Section icon={BarChart3} title="Rapports et états">
      <p className="text-sm text-muted-foreground">Les rapports vous donnent une vision claire de votre situation financière sur n'importe quelle période.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground text-sm">État clients</p>
          </div>
          <p className="text-sm text-muted-foreground">Total des ventes, montant encaissé et reste à encaisser par client. Identifiez qui vous doit quoi en un coup d'œil.</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground text-sm">État fournisseurs</p>
          </div>
          <p className="text-sm text-muted-foreground">Total des achats de matières premières, montant réglé et solde restant dû par fournisseur.</p>
        </div>
      </div>
      <Note type="info">Ces états peuvent couvrir une période longue (plusieurs mois ou toute l'année) pour une vue complète de vos relations commerciales.</Note>
    </Section>

    <Section icon={Activity} title="Historique des mouvements de stock">
      <p className="text-sm text-muted-foreground">Chaque entrée et sortie de stock est enregistrée automatiquement — achats, ventes, déclarations de production et ajustements manuels. L'historique est séparé en deux onglets : un pour les matières premières, un pour les produits finis. Chaque ligne affiche le <strong className="text-foreground">stock avant</strong> et le <strong className="text-foreground">stock après</strong> le mouvement.</p>
      <Note type="info">Le stock actuel d'un produit correspond toujours au stock après de son dernier mouvement enregistré.</Note>
    </Section>

    <Section icon={BookOpen} title="Règles à connaître">
      <p className="text-sm font-medium text-foreground">Modification et annulation d'une vente</p>
      <RulesTable
        headers={['Situation', 'Modifier', 'Annuler']}
        rows={[
          ['Vente créée, sans facture ni paiement', '✅ Oui', '✅ Oui'],
          ['Facture générée', '❌ Non', '❌ Non'],
          ['Paiement enregistré', '❌ Non', '❌ Non'],
          ['Vente annulée', '❌ Non', '—'],
        ]}
      />
      <p className="text-xs text-muted-foreground">Ces restrictions protègent la cohérence de vos documents comptables.</p>
      <p className="text-sm font-medium text-foreground mt-2">Modification et annulation d'un achat</p>
      <RulesTable
        headers={['Situation', 'Modifier', 'Annuler']}
        rows={[
          ['Achat créé, sans paiement', '✅ Oui', '✅ Oui'],
          ['Paiement enregistré', '✅ Oui', '❌ Non'],
          ['Achat annulé', '❌ Non', '—'],
        ]}
      />
    </Section>

  </div>
)

// ─── Page principale ────────────────────────────────────────────────────────────

export const AidePage = () => {
  const { data: profile } = useProfile()
  const isProduction = profile?.business_mode === 'production'

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Aide" />
      {isProduction ? <GuideProduction /> : <GuideRevente />}
    </div>
  )
}
