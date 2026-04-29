import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  ArrowLeft,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  CreditCard,
  Info,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import {
  useSupplier,
  useSupplierPurchases,
  useSupplierPayments,
  useSupplierMonthlyState,
} from '@/hooks/useSuppliers'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Purchase, SupplierPayment } from '@/types'

// ── MonthPicker inline ────────────────────────────────────────────────────────

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
  const prev = () => {
    if (month === 1) onChange(year - 1, 12)
    else onChange(year, month - 1)
  }
  const next = () => {
    if (month === 12) onChange(year + 1, 1)
    else onChange(year, month + 1)
  }

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

// ── Badge statut paiement ─────────────────────────────────────────────────────

const PaymentBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🟢 Payé</Badge>
  if (status === 'partial') return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">🟡 Partiel</Badge>
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">🔴 Impayé</Badge>
}

// ── Onglet Infos ──────────────────────────────────────────────────────────────

const TabInfos = ({ supplier }: { supplier: ReturnType<typeof useSupplier>['data'] }) => {
  if (!supplier) return null
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {[
        { label: 'Nom', value: supplier.name },
        { label: 'Téléphone', value: supplier.phone || '—' },
        { label: 'Adresse', value: supplier.address || '—' },
        { label: 'ICE', value: supplier.ice || '—' },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-lg border bg-muted/30 p-4">
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</dt>
          <dd className="text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ── Onglet Achats ─────────────────────────────────────────────────────────────

const TabAchats = ({ supplierId }: { supplierId: string }) => {
  const navigate = useNavigate()
  const { data: purchases = [], isLoading } = useSupplierPurchases(supplierId)

  const columns = useMemo<ColumnDef<Purchase>[]>(() => [
    { accessorKey: 'reference', header: 'Référence', cell: ({ row }) => row.original.reference || '—' },
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
          onClick={() => navigate(`/purchases/${row.original.id}/edit`)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ], [navigate])

  return (
    <DataTable
      columns={columns}
      data={purchases as Purchase[]}
      isLoading={isLoading}
      searchPlaceholder="Rechercher un achat..."
      exportFileName={`achats-fournisseur-${supplierId}`}
      exportMapper={p => ({
        Référence: (p as Purchase).reference ?? '',
        Date: formatDate((p as Purchase).date),
        Total: (p as Purchase).total,
        Payé: (p as Purchase).paid,
        Reste: (p as Purchase).remaining,
        Statut: (p as Purchase).status,
      })}
    />
  )
}

// ── Onglet Paiements ──────────────────────────────────────────────────────────

const TabPaiements = ({ supplierId }: { supplierId: string }) => {
  const { data: payments = [], isLoading } = useSupplierPayments(supplierId)

  const columns = useMemo<ColumnDef<SupplierPayment>[]>(() => [
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
    {
      accessorKey: 'purchase_id',
      header: 'Achat réf.',
      cell: ({ row }) => {
        const ref = (row.original as unknown as { purchases?: { reference?: string } }).purchases?.reference
        return ref || row.original.purchase_id.substring(0, 8)
      },
    },
    { accessorKey: 'amount', header: 'Montant', cell: ({ row }) => formatCurrency(row.original.amount) },
    { accessorKey: 'note', header: 'Note', cell: ({ row }) => row.original.note || '—' },
  ], [])

  const total = (payments as SupplierPayment[]).reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={payments as SupplierPayment[]}
        isLoading={isLoading}
        searchPlaceholder="Rechercher un paiement..."
        exportFileName={`paiements-fournisseur-${supplierId}`}
        exportMapper={p => ({
          Date: formatDate((p as SupplierPayment).date),
          Montant: (p as SupplierPayment).amount,
          Note: (p as SupplierPayment).note ?? '',
        })}
      />
      {payments.length > 0 && (
        <div className="flex justify-end">
          <p className="text-sm font-medium">
            Total décaissé : <span className="text-foreground font-bold">{formatCurrency(total)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ── Onglet État ───────────────────────────────────────────────────────────────

const TabEtat = ({ supplierId }: { supplierId: string }) => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useSupplierMonthlyState(supplierId, year, month)

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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total achats</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.totalAchats ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total payé</p>
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

type Tab = 'infos' | 'achats' | 'paiements' | 'etat'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'infos', label: 'Infos', icon: Info },
  { key: 'achats', label: 'Achats', icon: TrendingDown },
  { key: 'paiements', label: 'Paiements', icon: CreditCard },
  { key: 'etat', label: 'État', icon: BarChart3 },
]

// ── Page principale ───────────────────────────────────────────────────────────

export const SupplierDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: supplier, isLoading } = useSupplier(id!)
  const [activeTab, setActiveTab] = useState<Tab>('infos')

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!supplier) {
    return <div className="text-center text-muted-foreground py-20">Fournisseur introuvable.</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Fournisseur : ${supplier.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/suppliers')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button size="sm" onClick={() => navigate(`/suppliers/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Éditer
            </Button>
          </div>
        }
      />

      {/* Onglets */}
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

      {/* Contenu */}
      <div>
        {activeTab === 'infos' && <TabInfos supplier={supplier} />}
        {activeTab === 'achats' && <TabAchats supplierId={id!} />}
        {activeTab === 'paiements' && <TabPaiements supplierId={id!} />}
        {activeTab === 'etat' && <TabEtat supplierId={id!} />}
      </div>
    </div>
  )
}
