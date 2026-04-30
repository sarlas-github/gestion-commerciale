import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeft,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Info,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import {
  useClient,
  useClientSales,
  useClientPayments,
  useClientMonthlyState,
} from '@/hooks/useClients'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import type { Sale, ClientPayment } from '@/types'

// ── MonthPicker ───────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const MonthPicker = ({
  year,
  month,
  onChange,
}: {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}) => {
  const prev = () => month === 1 ? onChange(year - 1, 12) : onChange(year, month - 1)
  const next = () => month === 12 ? onChange(year + 1, 1) : onChange(year, month + 1)

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={prev}>
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-[120px] text-center text-sm font-medium">
        {MONTHS_FR[month - 1]} {year}
      </span>
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={next}>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────────────────────────

const PaymentBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Payé</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

// ── Onglet Infos ──────────────────────────────────────────────────────────────

const TabInfos = ({ client }: { client: ReturnType<typeof useClient>['data'] }) => {
  if (!client) return null
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {[
        { label: 'Nom', value: client.name },
        { label: 'Téléphone', value: formatPhone(client.phone) || '—' },
        { label: 'Adresse', value: client.address || '—' },
        { label: 'ICE', value: client.ice || '—' },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-lg border bg-muted/30 p-4">
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</dt>
          <dd className="text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ── Onglet Ventes ─────────────────────────────────────────────────────────────

const TabVentes = ({ clientId }: { clientId: string }) => {
  const navigate = useNavigate()
  const { data: sales = [], isLoading } = useClientSales(clientId)

  const columns = useMemo<ColumnDef<Sale>[]>(() => [
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: 'total', header: 'Total', cell: ({ row }) => formatCurrency(row.original.total) },
    { accessorKey: 'paid', header: 'Payé', cell: ({ row }) => formatCurrency(row.original.paid) },
    {
      accessorKey: 'remaining',
      header: 'Reste',
      cell: ({ row }) => (
        <span className={row.original.remaining > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
          {formatCurrency(row.original.remaining)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => <PaymentBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/sales/${row.original.id}/edit`)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ], [navigate])

  return (
    <DataTable
      columns={columns}
      data={sales}
      isLoading={isLoading}
      searchPlaceholder="Rechercher une vente..."
      exportFileName={`ventes-client-${clientId}`}
      exportMapper={s => ({
        Date: formatDate(s.date),
        Total: s.total,
        Payé: s.paid,
        Reste: s.remaining,
        Statut: s.status === 'paid' ? 'Payé' : s.status === 'partial' ? 'Partiel' : 'Impayé',
      })}
    />
  )
}

// ── Onglet Paiements ──────────────────────────────────────────────────────────

const TabPaiements = ({ clientId }: { clientId: string }) => {
  const { data: payments = [], isLoading } = useClientPayments(clientId)

  const columns = useMemo<ColumnDef<ClientPayment>[]>(() => [
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: 'amount', header: 'Montant', cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: 'methode_paiement', header: 'Méthode', cell: ({ row }) => row.original.methode_paiement || '—' },
    { accessorKey: 'note', header: 'Note', cell: ({ row }) => row.original.note || '—' },
  ], [])

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        searchPlaceholder="Rechercher un paiement..."
        exportFileName={`paiements-client-${clientId}`}
        exportMapper={p => ({
          Date: formatDate(p.date),
          Montant: p.amount,
          Méthode: p.methode_paiement ?? '',
          Note: p.note ?? '',
        })}
      />
      {payments.length > 0 && (
        <div className="flex justify-end">
          <p className="text-sm font-medium">
            Total encaissé : <span className="font-bold text-green-600">{formatCurrency(total)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ── Onglet État ───────────────────────────────────────────────────────────────

const TabEtat = ({ clientId }: { clientId: string }) => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useClientMonthlyState(clientId, year, month)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Synthèse mensuelle</h3>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total ventes</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.totalVentes ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total encaissé</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.totalPaye ?? 0)}</p>
          </div>
          <div className={`rounded-lg border p-5 space-y-1 ${(data?.resteAPayer ?? 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-muted/30'}`}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reste à payer</p>
            <p className={`text-2xl font-bold ${(data?.resteAPayer ?? 0) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {formatCurrency(data?.resteAPayer ?? 0)}
              {(data?.resteAPayer ?? 0) > 0 && ' 🔴'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tabs config ───────────────────────────────────────────────────────────────

type Tab = 'infos' | 'ventes' | 'paiements' | 'etat'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'infos',      label: 'Infos',      icon: Info },
  { key: 'ventes',     label: 'Ventes',     icon: TrendingUp },
  { key: 'paiements',  label: 'Paiements',  icon: CreditCard },
  { key: 'etat',       label: 'État',       icon: BarChart3 },
]

// ── Page principale ───────────────────────────────────────────────────────────

export const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id!)
  const [activeTab, setActiveTab] = useState<Tab>('infos')

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) {
    return <div className="text-center text-muted-foreground py-20">Client introuvable.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Client : ${client.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button size="sm" onClick={() => navigate(`/clients/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Éditer
            </Button>
          </div>
        }
      />

      <div className="border-b">
        <nav className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'infos'     && <TabInfos client={client} />}
        {activeTab === 'ventes'    && <TabVentes clientId={id!} />}
        {activeTab === 'paiements' && <TabPaiements clientId={id!} />}
        {activeTab === 'etat'      && <TabEtat clientId={id!} />}
      </div>
    </div>
  )
}
