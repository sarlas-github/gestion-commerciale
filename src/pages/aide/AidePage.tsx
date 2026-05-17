import { useState, createContext, useContext } from 'react'
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
  Users,
  Layers,
  Cog,
  ChevronDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

const PrintContext = createContext(false)

// ─── Primitives ────────────────────────────────────────────────────────────────

const Section = ({
  icon: Icon,
  title,
  n,
  children,
}: {
  icon: React.ElementType
  title: string
  n: number
  children: React.ReactNode
}) => {
  const printAll = useContext(PrintContext)
  const [open, setOpen] = useState(true)
  const visible = printAll || open
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="flex-1 text-base font-semibold text-foreground">
          <span className="text-muted-foreground font-normal mr-1.5">{n}.</span>{title}
        </h2>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200', !visible && '-rotate-90')} />
      </button>
      {visible && (
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
          <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
        </div>
      </div>
    ))}
  </div>
)

const RulesTable = ({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-xs sm:text-sm">
      <thead>
        <tr className="border-b bg-muted/50">
          {headers.map((h, i) => <th key={i} className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-left font-semibold text-foreground">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
            {row.map((cell, j) => <td key={j} className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-muted-foreground">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const StatusBadge = ({ type }: { type: 'paid' | 'partial' | 'unpaid' | 'cancelled' | 'instock' | 'low' | 'outofstock' }) => {
  const map = {
    paid:       { label: 'Payé',     cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    partial:    { label: 'Partiel',  cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    unpaid:     { label: 'Impayé',   cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    cancelled:  { label: 'Annulé',   cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
    instock:    { label: 'En stock', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    low:        { label: 'Faible',   cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    outofstock: { label: 'Rupture',  cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  }
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', map[type].cls)}>{map[type].label}</span>
}


const IntroCard = ({ lines }: { lines: { before: string; after: string }[] }) => (
  <div className="rounded-xl border bg-primary/5 border-primary/20 p-6 space-y-5">
    <div className="space-y-1">
      <p className="text-base font-bold text-foreground">Avec PilotCommerce, vous prenez enfin le contrôle.</p>
      <p className="text-sm text-muted-foreground">Accédez à votre activité à tout moment, depuis n'importe quel appareil — PC ou mobile.</p>
      <p className="text-sm text-muted-foreground">Fini la gestion à l'aveugle. Voici ce que l'application change concrètement pour vous :</p>
    </div>
    <div className="space-y-3">
      {lines.map((line, i) => (
        <div key={i} className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-1 sm:gap-3">
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{line.before}</p>
          </div>
          <span className="hidden sm:block text-muted-foreground/40 text-xs font-bold">→</span>
          <div className="flex items-start gap-2 pl-6 sm:pl-0">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground font-medium">{line.after}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ─── Guide Revente ──────────────────────────────────────────────────────────────

const GuideRevente = () => (
  <div className="space-y-4">

    <IntroCard lines={[
      { before: 'Stock suivi à la main, erreurs et oublis fréquents', after: 'Stock mis à jour automatiquement à chaque achat et vente' },
      { before: 'Impossible de savoir qui vous doit quoi', after: 'État clients et fournisseurs clair, impayés visibles en un coup d\'œil' },
      { before: 'Factures saisies manuellement, risque d\'erreur', after: 'Facture générée à chaque vente, reçu à chaque paiement — numérotés, archivés, sans saisie manuelle' },
      { before: 'Aucune vision globale sur votre activité', after: 'Dashboard avec indicateurs clés et graphiques pour piloter votre commerce' },
    ]} />

    <Section icon={LayoutDashboard} title="Votre tableau de bord" n={1}>
      <p className="text-sm text-muted-foreground">Dès la connexion, le tableau de bord centralise tous vos indicateurs clés pour la période sélectionnée. Vous pouvez changer le mois — ou passer en vue annuelle — depuis le sélecteur en haut de page.</p>
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Indicateurs calculés</p>
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="col-span-2 sm:col-span-1 rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Marge brute</p>
              <p className="text-xs text-muted-foreground leading-snug">CA − coût des achats</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Trésorerie</p>
              <p className="text-xs text-muted-foreground leading-snug">Encaissé − Décaissé</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Volume ventes</p>
              <p className="text-xs text-muted-foreground leading-snug">Nombre de transactions</p>
            </div>
          </div>
          <div className="mx-1 h-px bg-border" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="col-span-2 sm:col-span-1 rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">CA Ventes</p>
              <p className="text-xs text-muted-foreground leading-snug">Total facturé sur la période</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Encaissé</p>
              <p className="text-xs text-muted-foreground leading-snug">Montant reçu des clients</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">À recevoir</p>
              <p className="text-xs text-muted-foreground leading-snug">Impayés clients restants</p>
            </div>
          </div>
          <div className="mx-1 h-px bg-border" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="col-span-2 sm:col-span-1 rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Total Achats</p>
              <p className="text-xs text-muted-foreground leading-snug">Dépenses engagées</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Décaissé</p>
              <p className="text-xs text-muted-foreground leading-snug">Payé aux fournisseurs</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">À payer</p>
              <p className="text-xs text-muted-foreground leading-snug">Dettes fournisseurs restantes</p>
            </div>
          </div>
        </div>
        <p className="text-sm font-medium text-foreground">Graphiques</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Évolution des ventes <strong>et</strong> des achats par jour (ou par mois en vue annuelle) — deux courbes superposées pour comparer vos encaissements et vos dépenses sur la même période</li>
          <li>Top 5 produits les plus vendus</li>
          <li>Top 5 clients par chiffre d'affaires</li>
          <li>Répartition des ventes par produit</li>
        </ul>
        <Note type="info">Le menu de navigation affiche en permanence un badge rouge avec le nombre de produits en alerte de stock, de clients impayés et de fournisseurs impayés. Cliquez sur l'entrée concernée : une barre d'alerte apparaît en haut de la page avec un bouton <strong>Filtrer</strong> pour n'afficher que les éléments concernés.</Note>
      </div>
    </Section>

    <Section icon={Package} title="Produits et stock" n={2}>
      <p className="text-sm text-muted-foreground">Votre catalogue de produits est votre base de référence : chaque produit que vous achetez ou vendez doit y être enregistré. Le stock se met à jour automatiquement à chaque achat ou vente — sans saisie manuelle.</p>
      <Note type="info">Deux façons d'ajouter un produit : depuis la page <strong>Produits</strong>, ou via le bouton <strong>+</strong> directement dans un formulaire d'achat ou de vente sans interrompre votre saisie. Dans les formulaires, tapez quelques lettres pour retrouver instantanément un produit grâce à l'autocomplétion.</Note>
      <RulesTable
        headers={['Statut', 'Signification']}
        rows={[
          [<StatusBadge type="instock" />, 'Stock suffisant, au-dessus du seuil d\'alerte'],
          [<StatusBadge type="low" />, 'Stock en dessous du seuil d\'alerte défini sur la fiche produit'],
          [<StatusBadge type="outofstock" />, 'Stock à zéro — réapprovisionnement urgent'],
        ]}
      />
      <Note type="info">Le seuil d'alerte se définit sur chaque fiche produit. Dès que le stock descend en dessous de ce seuil, le badge d'alerte apparaît dans le menu de navigation. Pensez à le configurer pour chaque produit que vous souhaitez surveiller.</Note>
      <p className="text-sm text-muted-foreground">Vous pouvez corriger un stock manuellement depuis la fiche produit (inventaire, perte) — chaque correction est tracée.</p>
      <p className="text-sm font-medium text-foreground">Individuel ou Pack</p>
      <p className="text-sm text-muted-foreground">Un produit peut être de type <strong className="text-foreground">Individuel</strong> (vendu à l'unité) ou <strong className="text-foreground">Pack</strong> (lot contenant plusieurs pièces). Pour un pack, vous définissez le nombre de pièces — utile si vous vendez par boîtes, cartons ou lots.</p>
      <Note type="info">Le nombre de pièces défini sur la fiche produit est une valeur par défaut. Vous pouvez le modifier directement au moment de chaque achat ou vente si le nombre de pièces par pack change pour cette transaction.</Note>
    </Section>

    <Section icon={ShoppingCart} title="Fournisseurs et achats" n={3}>
      <p className="text-sm text-muted-foreground">Votre liste de fournisseurs est votre carnet d'adresses : une base de référence que vous enrichissez au fil du temps. Chaque achat met à jour le stock et suit automatiquement ce que vous devez encore payer.</p>
      <Note type="info">Deux façons d'ajouter un fournisseur : depuis la page <strong>Fournisseurs</strong>, ou via le bouton <strong>+</strong> directement dans un formulaire d'achat. Dans les formulaires, tapez quelques lettres pour retrouver un fournisseur grâce à l'autocomplétion.</Note>
      <Steps items={[
        { title: 'Choisissez le fournisseur', desc: 'Sélectionnez dans la liste, ou créez-en un nouveau directement depuis le formulaire.' },
        { title: 'Ajoutez les produits achetés', desc: 'Quantité et prix d\'achat pour chaque article. Le montant se calcule automatiquement : quantité × pièces × prix unitaire. La TVA s\'applique sur ce total — le taux par défaut vient des Paramètres, mais reste modifiable dans le formulaire.' },
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
      <p className="text-sm text-muted-foreground">Les paiements partiels sont supportés. Le statut se met à jour automatiquement à chaque règlement.</p>
      <p className="text-sm text-muted-foreground">Depuis la fiche d'un fournisseur, consultez l'historique complet de vos échanges : achats, paiements versés et solde restant dû. Un bouton <strong className="text-foreground">WhatsApp</strong> vous permet de le contacter directement depuis sa fiche, sans quitter l'application.</p>
    </Section>

    <Section icon={TrendingUp} title="Clients et ventes" n={4}>
      <p className="text-sm text-muted-foreground">Votre liste de clients est votre carnet d'adresses : une base de référence centrale pour toutes vos ventes. L'application génère automatiquement la facture, déduit le stock, et garde une trace de tout ce que vos clients vous doivent.</p>
      <Note type="info">Deux façons d'ajouter un client : depuis la page <strong>Clients</strong>, ou via le bouton <strong>+</strong> directement dans un formulaire de vente. Dans les formulaires, tapez quelques lettres pour retrouver un client grâce à l'autocomplétion.</Note>
      <Steps items={[
        { title: 'Choisissez le client', desc: 'Sélectionnez dans la liste, ou créez-en un nouveau directement depuis le formulaire.' },
        { title: 'Ajoutez les produits vendus', desc: 'Le prix de vente habituel est pré-rempli. Le montant se calcule automatiquement : quantité × pièces × prix unitaire. La TVA s\'applique sur ce total — le taux par défaut vient des Paramètres, mais reste modifiable dans le formulaire.' },
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
      <p className="text-sm text-muted-foreground">Depuis la fiche d'un client, consultez toutes ses ventes, ses paiements, et le total qu'il vous doit encore. Un bouton <strong className="text-foreground">WhatsApp</strong> vous permet de le contacter directement depuis sa fiche, sans quitter l'application.</p>
    </Section>

    <Section icon={FileText} title="Factures et paiements" n={5}>
      <p className="text-sm text-muted-foreground">Vos documents existent en deux états distincts :</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
          <p className="text-sm font-semibold text-foreground">Aperçu</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Depuis la page d'une vente, consultez la facture ou le reçu à tout moment. Le document est visible mais sans numéro officiel attribué — pratique pour vérifier avant de finaliser.</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
          <p className="text-sm font-semibold text-foreground">Génération</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Le bouton <strong>Générer</strong> attribue un numéro officiel définitif (FAC-2026-001… ou REC-2026-001…) et archive le document dans la section <strong>Documents</strong>. À partir de ce moment, il est immuable.</p>
        </div>
      </div>
      <RulesTable
        headers={['Document', 'Numérotation', 'Généré quand ?']}
        rows={[
          ['Facture', 'FAC-2026-001', 'À la demande depuis la page vente'],
          ['Reçu de paiement', 'REC-2026-001', 'À la demande depuis la page paiement'],
        ]}
      />
      <Note type="ok">Documents fiables et immuables. Une facture conserve toujours les informations exactes du moment de sa génération — coordonnées de votre entreprise, données du client, montants — même si ces informations sont modifiées par la suite.</Note>
      <Note type="info">Vos documents sont personnalisables : logo et couleur de marque de votre entreprise apparaissent sur chaque facture et reçu. Pensez à configurer votre entreprise dans <strong>Paramètres</strong> avant de générer vos premiers documents.</Note>
      <p className="text-sm font-medium text-foreground">Téléchargement, impression et partage</p>
      <p className="text-sm text-muted-foreground">Depuis l'aperçu d'une facture ou d'un reçu, vous pouvez <strong className="text-foreground">télécharger le PDF</strong>, l'<strong className="text-foreground">imprimer</strong> directement, ou l'<strong className="text-foreground">envoyer via WhatsApp</strong> en un clic — le message est pré-rempli avec le document joint.</p>
      <p className="text-sm text-muted-foreground">Les paiements partiels sont supportés : enregistrez plusieurs règlements sur une même vente ou un même achat. Le statut se met à jour à chaque fois.</p>
    </Section>

    <Section icon={BarChart3} title="Rapports et états" n={6}>
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
      <p className="text-sm font-medium text-foreground">Paiements</p>
      <p className="text-sm text-muted-foreground">La section <strong className="text-foreground">Paiements</strong> du menu vous donne accès au détail de chaque règlement enregistré — côté clients et côté fournisseurs — avec le montant, la date et la vente ou l'achat associé.</p>
    </Section>

    <Section icon={Activity} title="Historique des mouvements de stock" n={7}>
      <p className="text-sm text-muted-foreground">Chaque entrée et sortie de stock est enregistrée automatiquement. Retrouvez, pour chaque produit, l'historique complet : quelle vente a consommé quoi, quel achat a réapprovisionné quoi. Chaque ligne affiche le <strong className="text-foreground">stock avant</strong> et le <strong className="text-foreground">stock après</strong> le mouvement.</p>
      <Note type="info">Le stock actuel d'un produit correspond toujours au stock après de son dernier mouvement enregistré.</Note>
    </Section>

    <Section icon={BookOpen} title="Règles à connaître" n={8}>
      <p className="text-sm font-medium text-foreground">Modification et annulation d'une vente</p>
      <RulesTable
        headers={['Situation', 'Modifier', 'Annuler']}
        rows={[
          ['Vente créée, sans facture ni paiement', '✅ Oui', '✅ Oui'],
          ['Facture générée', '❌ Non', '❌ Non'],
          ['Reçu de paiement généré', '❌ Non', '❌ Non'],
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

    <IntroCard lines={[
      { before: 'Stock de matières premières et produits finis suivis séparément à la main', after: 'Deux stocks distincts, mis à jour automatiquement à chaque achat, production et vente' },
      { before: 'Impossible de savoir qui vous doit quoi', after: 'État clients et fournisseurs clair, impayés visibles en un coup d\'œil' },
      { before: 'Factures saisies manuellement, risque d\'erreur', after: 'Facture générée à chaque vente, reçu à chaque paiement — numérotés, archivés, sans saisie manuelle' },
      { before: 'Aucune vision globale sur votre activité', after: 'Dashboard avec indicateurs clés et graphiques pour piloter votre production' },
    ]} />

    <Section icon={LayoutDashboard} title="Votre tableau de bord" n={1}>
      <p className="text-sm text-muted-foreground">Dès la connexion, le tableau de bord centralise tous vos indicateurs clés pour la période sélectionnée. Vous pouvez changer le mois — ou passer en vue annuelle — depuis le sélecteur en haut de page.</p>
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Indicateurs calculés</p>
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="col-span-2 sm:col-span-1 rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Marge brute</p>
              <p className="text-xs text-muted-foreground leading-snug">CA − coût des achats</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Trésorerie</p>
              <p className="text-xs text-muted-foreground leading-snug">Encaissé − Décaissé</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Volume ventes</p>
              <p className="text-xs text-muted-foreground leading-snug">Nombre de transactions</p>
            </div>
          </div>
          <div className="mx-1 h-px bg-border" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="col-span-2 sm:col-span-1 rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">CA Ventes</p>
              <p className="text-xs text-muted-foreground leading-snug">Total facturé sur la période</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Encaissé</p>
              <p className="text-xs text-muted-foreground leading-snug">Montant reçu des clients</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">À recevoir</p>
              <p className="text-xs text-muted-foreground leading-snug">Impayés clients restants</p>
            </div>
          </div>
          <div className="mx-1 h-px bg-border" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="col-span-2 sm:col-span-1 rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Total Achats</p>
              <p className="text-xs text-muted-foreground leading-snug">Dépenses engagées</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">Décaissé</p>
              <p className="text-xs text-muted-foreground leading-snug">Payé aux fournisseurs</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-0.5">
              <p className="font-semibold text-foreground text-xs">À payer</p>
              <p className="text-xs text-muted-foreground leading-snug">Dettes fournisseurs restantes</p>
            </div>
          </div>
        </div>
        <p className="text-sm font-medium text-foreground">Graphiques</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Évolution des ventes <strong>et</strong> des achats par jour (ou par mois en vue annuelle) — deux courbes superposées pour comparer vos encaissements et vos dépenses sur la même période</li>
          <li>Top 5 produits les plus vendus</li>
          <li>Top 5 clients par chiffre d'affaires</li>
          <li>Répartition des ventes par produit</li>
        </ul>
        <Note type="info">Le menu de navigation affiche en permanence un badge rouge avec le nombre de produits en alerte de stock, de clients impayés et de fournisseurs impayés. Cliquez sur l'entrée concernée : une barre d'alerte apparaît en haut de la page avec un bouton <strong>Filtrer</strong> pour n'afficher que les éléments concernés.</Note>
      </div>
    </Section>

    <Section icon={Package} title="Votre catalogue de produits" n={2}>
      <p className="text-sm text-muted-foreground">Votre catalogue est votre base de référence : tous les produits que vous achetez ou fabriquez doivent y être enregistrés. Il distingue deux types, chacun avec son propre stock suivi en temps réel.</p>
      <Note type="info">Deux façons d'ajouter un produit : depuis la page <strong>Produits</strong>, ou via le bouton <strong>+</strong> directement dans un formulaire sans interrompre votre saisie. Dans les formulaires, tapez quelques lettres pour retrouver instantanément un produit grâce à l'autocomplétion.</Note>
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
      <p className="text-sm text-muted-foreground">Les stocks se mettent à jour automatiquement à chaque achat, vente ou déclaration de production.</p>
      <p className="text-sm font-medium text-foreground">Individuel ou Pack</p>
      <p className="text-sm text-muted-foreground">Un produit peut être de type <strong className="text-foreground">Individuel</strong> (à l'unité) ou <strong className="text-foreground">Pack</strong> (lot contenant plusieurs pièces). Pour un pack, vous définissez le nombre de pièces — utile si vous achetez ou vendez par cartons, boîtes ou lots.</p>
      <Note type="info">Le nombre de pièces défini sur la fiche produit est une valeur par défaut. Vous pouvez le modifier directement au moment de chaque achat ou vente si le nombre de pièces par pack change pour cette transaction.</Note>
      <RulesTable
        headers={['Statut', 'Signification']}
        rows={[
          [<StatusBadge type="instock" />, 'Stock suffisant, au-dessus du seuil d\'alerte'],
          [<StatusBadge type="low" />, 'Stock en dessous du seuil d\'alerte défini sur la fiche produit'],
          [<StatusBadge type="outofstock" />, 'Stock à zéro — réapprovisionnement urgent'],
        ]}
      />
      <Note type="info">Le seuil d'alerte se définit sur chaque fiche produit. Dès que le stock descend en dessous de ce seuil, le badge d'alerte apparaît dans le menu de navigation. Pensez à le configurer pour chaque produit que vous souhaitez surveiller.</Note>
    </Section>

    <Section icon={ShoppingCart} title="Achats de matières premières" n={3}>
      <p className="text-sm text-muted-foreground">Votre liste de fournisseurs est votre carnet d'adresses fournisseurs. Chaque achat enregistré augmente automatiquement le stock des matières premières concernées.</p>
      <Note type="info">Deux façons d'ajouter un fournisseur : depuis la page <strong>Fournisseurs</strong>, ou via le bouton <strong>+</strong> directement dans un formulaire d'achat. Dans les formulaires, tapez quelques lettres pour retrouver un fournisseur grâce à l'autocomplétion.</Note>
      <Steps items={[
        { title: 'Choisissez le fournisseur', desc: 'Sélectionnez dans la liste, ou créez-en un nouveau directement depuis le formulaire.' },
        { title: 'Ajoutez les matières premières achetées', desc: 'Quantité et prix d\'achat pour chaque article. Le montant se calcule automatiquement : quantité × pièces × prix unitaire. La TVA s\'applique sur ce total — le taux par défaut vient des Paramètres, mais reste modifiable dans le formulaire.' },
        { title: 'Indiquez ce que vous avez déjà payé (optionnel)', desc: 'Si un acompte a été versé, saisissez le montant.' },
        { title: 'Validez', desc: 'Le stock des matières premières est mis à jour instantanément.' },
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
      <p className="text-sm text-muted-foreground">Les paiements partiels sont supportés. Le statut se met à jour automatiquement à chaque règlement.</p>
      <p className="text-sm text-muted-foreground">Depuis la fiche d'un fournisseur, consultez l'historique complet de vos échanges : achats, paiements versés et solde restant dû. Un bouton <strong className="text-foreground">WhatsApp</strong> vous permet de le contacter directement depuis sa fiche, sans quitter l'application.</p>
    </Section>

    <Section icon={Cog} title="Déclarer votre production" n={4}>
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

    <Section icon={TrendingUp} title="Ventes" n={5}>
      <p className="text-sm text-muted-foreground">Votre liste de clients est votre carnet d'adresses clients. L'application génère automatiquement la facture, déduit le stock et garde une trace de tout ce que vos clients vous doivent.</p>
      <Note type="info">Deux façons d'ajouter un client : depuis la page <strong>Clients</strong>, ou via le bouton <strong>+</strong> directement dans un formulaire de vente. Dans les formulaires, tapez quelques lettres pour retrouver un client grâce à l'autocomplétion.</Note>
      <Steps items={[
        { title: 'Choisissez le client', desc: 'Sélectionnez dans la liste, ou créez-en un nouveau directement depuis le formulaire.' },
        { title: 'Ajoutez les produits vendus', desc: 'Le prix de vente habituel est pré-rempli. Le montant se calcule automatiquement : quantité × pièces × prix unitaire. La TVA s\'applique sur ce total — le taux par défaut vient des Paramètres, mais reste modifiable dans le formulaire.' },
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
      <p className="text-sm text-muted-foreground">Depuis la fiche d'un client, consultez toutes ses ventes, ses paiements, et le total qu'il vous doit encore. Un bouton <strong className="text-foreground">WhatsApp</strong> vous permet de le contacter directement depuis sa fiche, sans quitter l'application.</p>
    </Section>

    <Section icon={FileText} title="Factures et paiements" n={6}>
      <p className="text-sm text-muted-foreground">Vos documents existent en deux états distincts :</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
          <p className="text-sm font-semibold text-foreground">Aperçu</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Depuis la page d'une vente, consultez la facture ou le reçu à tout moment. Le document est visible mais sans numéro officiel attribué — pratique pour vérifier avant de finaliser.</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
          <p className="text-sm font-semibold text-foreground">Génération</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Le bouton <strong>Générer</strong> attribue un numéro officiel définitif (FAC-2026-001… ou REC-2026-001…) et archive le document dans la section <strong>Documents</strong>. À partir de ce moment, il est immuable.</p>
        </div>
      </div>
      <RulesTable
        headers={['Document', 'Numérotation', 'Généré quand ?']}
        rows={[
          ['Facture', 'FAC-2026-001', 'À la demande depuis la page vente'],
          ['Reçu de paiement', 'REC-2026-001', 'À la demande depuis la page paiement'],
        ]}
      />
      <Note type="ok">Documents fiables et immuables. Une facture conserve toujours les informations exactes du moment de sa génération, même si vos coordonnées ou celles du client changent par la suite.</Note>
      <Note type="info">Vos documents sont personnalisables : logo et couleur de marque de votre entreprise apparaissent sur chaque facture et reçu. Pensez à configurer votre entreprise dans <strong>Paramètres</strong> avant de générer vos premiers documents.</Note>
      <p className="text-sm font-medium text-foreground">Téléchargement, impression et partage</p>
      <p className="text-sm text-muted-foreground">Depuis l'aperçu d'une facture ou d'un reçu, vous pouvez <strong className="text-foreground">télécharger le PDF</strong>, l'<strong className="text-foreground">imprimer</strong> directement, ou l'<strong className="text-foreground">envoyer via WhatsApp</strong> en un clic — le message est pré-rempli avec le document joint.</p>
      <p className="text-sm text-muted-foreground">Les paiements partiels sont supportés. Le statut se met à jour automatiquement à chaque règlement.</p>
    </Section>

    <Section icon={BarChart3} title="Rapports et états" n={7}>
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
      <p className="text-sm font-medium text-foreground">Paiements</p>
      <p className="text-sm text-muted-foreground">La section <strong className="text-foreground">Paiements</strong> du menu vous donne accès au détail de chaque règlement enregistré — côté clients et côté fournisseurs — avec le montant, la date et la vente ou l'achat associé.</p>
    </Section>

    <Section icon={Activity} title="Historique des mouvements de stock" n={8}>
      <p className="text-sm text-muted-foreground">Chaque entrée et sortie de stock est enregistrée automatiquement — achats, ventes, déclarations de production et ajustements manuels. L'historique est séparé en deux onglets : un pour les matières premières, un pour les produits finis. Chaque ligne affiche le <strong className="text-foreground">stock avant</strong> et le <strong className="text-foreground">stock après</strong> le mouvement.</p>
      <Note type="info">Le stock actuel d'un produit correspond toujours au stock après de son dernier mouvement enregistré.</Note>
    </Section>

    <Section icon={BookOpen} title="Règles à connaître" n={9}>
      <p className="text-sm font-medium text-foreground">Modification et annulation d'une vente</p>
      <RulesTable
        headers={['Situation', 'Modifier', 'Annuler']}
        rows={[
          ['Vente créée, sans facture ni paiement', '✅ Oui', '✅ Oui'],
          ['Facture générée', '❌ Non', '❌ Non'],
          ['Reçu de paiement généré', '❌ Non', '❌ Non'],
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
  const [printAll] = useState(false)

  return (
    <PrintContext.Provider value={printAll}>
      <style>{`
        @media print {
          aside, header { display: none !important; }
          body, html { overflow: visible !important; height: auto !important; padding: 12mm !important; }
          #main-scroll { overflow: visible !important; height: auto !important; padding: 0 !important; }
          .flex.h-screen { height: auto !important; overflow: visible !important; }
          .flex-1.overflow-hidden { overflow: visible !important; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader title="Guide utilisateur" />
          {/* <Button variant="outline" size="sm" onClick={handleDownload} className="shrink-0 mt-1 print:hidden">
            <Download className="h-4 w-4 mr-2" />
            Télécharger guide
          </Button> */}
        </div>

        {/* En-tête visible uniquement à l'impression */}
        <div className="hidden print:flex items-center justify-between pb-3 border-b mb-2">
          <span className="text-sm font-semibold text-gray-700">www.pilot-commerce.com — Guide utilisateur</span>
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-FR')}</span>
        </div>

        <div className="space-y-4">
          {isProduction ? <GuideProduction /> : <GuideRevente />}
        </div>
      </div>
    </PrintContext.Provider>
  )
}
