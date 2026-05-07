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
  Link2,
} from 'lucide-react'
import { SaleQuickViewModal } from '@/features/sales/SaleQuickViewModal'
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
        <div key={label} className="rounded-lg border bg-card p-4">
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
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleQuickView = (id: string) => {
    setSelectedSaleId(id)
    setIsModalOpen(true)
  }

  const columns = useMemo<ColumnDef<Sale>[]>(() => [
    {
      accessorKey: 'reference',
      header: 'Référence',
      cell: ({ row }) => (
        <button
          className="flex items-center gap-1 text-primary hover:underline text-sm font-medium"
          onClick={() => handleQuickView(row.original.id)}
        >
          <Link2 className="h-3.5 w-3.5" />
          {row.original.reference || '—'}
        </button>
      ),
    },
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
    <>
      <DataTable
        columns={columns}
        data={sales}
        isLoading={isLoading}
        exportFileName={`ventes-client-${clientId}`}
        exportMapper={s => ({
          Référence: s.reference ?? '',
          Date: formatDate(s.date),
          Total: s.total,
          Payé: s.paid,
          Reste: s.remaining,
          Statut: s.status === 'paid' ? 'Payé' : s.status === 'partial' ? 'Partiel' : 'Impayé',
        })}
      />

      <SaleQuickViewModal
        saleId={selectedSaleId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}

// ── Onglet Paiements ──────────────────────────────────────────────────────────

const TabPaiements = ({ clientId }: { clientId: string }) => {
  const { data: payments = [], isLoading } = useClientPayments(clientId)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleQuickView = (id: string) => {
    setSelectedSaleId(id)
    setIsModalOpen(true)
  }

  const columns = useMemo<ColumnDef<ClientPayment>[]>(() => [
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    {
      accessorKey: 'sale_id',
      header: 'Vente réf.',
      cell: ({ row }) => {
        const ref = (row.original as any).sales?.reference
        return (
          <button
            className="flex items-center gap-1 text-primary hover:underline text-sm font-medium"
            onClick={() => handleQuickView(row.original.sale_id)}
          >
            <Link2 className="h-3.5 w-3.5" />
            {ref || row.original.sale_id.substring(0, 8)}
          </button>
        )
      },
    },
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

      <SaleQuickViewModal
        saleId={selectedSaleId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
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
          <div className="rounded-lg border bg-card p-5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total ventes</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.totalVentes ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-card p-5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total encaissé</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.totalPaye ?? 0)}</p>
          </div>
          <div className={`rounded-lg border p-5 space-y-1 ${(data?.resteAPayer ?? 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-card'}`}>
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

  const waPhone = (() => {
    const raw = client.phone ?? null
    if (!raw) return null
    const d = raw.replace(/\D/g, '')
    if (d.startsWith('0') && d.length === 10) return '212' + d.slice(1)
    if (d.length === 9) return '212' + d
    if (d.startsWith('212') && d.length === 12) return d
    return d // Fallback if already formatted with country code
  })()
  const waMessage = `Bonjour Mme/M. ${client.name},\n\n`
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}` : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Client : ${client.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </Button>

            {waUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(waUrl, '_blank', 'noopener,noreferrer')}
                className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
              >
                <svg className="h-4 w-4 shrink-0 sm:mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            )}

            <Button onClick={() => navigate(`/clients/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Éditer</span>
              <span className="sm:hidden">Édit</span>
            </Button>
          </div>
        }
      />

      <div className="border-b">
        <nav className="flex -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
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





