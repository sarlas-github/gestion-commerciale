import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  BarChart, Bar,
  PieChart, Pie, Cell, Legend,
  Tooltip,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrency, cn } from '@/lib/utils'

// ── Constantes ────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

// ── Sous-composants ───────────────────────────────────────────────────────────

const KPICard = ({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color?: 'red' | 'green'
}) => (
  <div className={cn(
    'rounded-lg border bg-card p-5 space-y-1',
    color === 'red' && 'border-red-200 bg-red-50',
  )}>
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className={cn(
      'text-2xl font-bold',
      color === 'red' && 'text-red-600',
      color === 'green' && 'text-green-600',
    )}>
      {value}
    </p>
    <p className="text-xs text-muted-foreground">{sub}</p>
  </div>
)

const ChartCard = ({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) => (
  <div className="rounded-lg border bg-card p-5 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {empty ? (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée ce mois
      </div>
    ) : children}
  </div>
)

const TooltipMAD = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium mb-1">{label !== undefined ? `Jour ${label}` : ''}</p>
      <p className="text-primary">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export const Dashboard = () => {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useDashboard(year, month)

  const prev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="space-y-6">
      {/* ── En-tête + MonthPicker ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-semibold">
            {MONTHS_FR[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KPICard label="💰 CA" value={formatCurrency(data?.ca ?? 0)} sub="Ventes du mois" />
            <KPICard label="✅ Encaissé" value={formatCurrency(data?.encaisse ?? 0)} sub="Paiements reçus" color="green" />
            <KPICard label="🔴 À recevoir" value={formatCurrency(data?.aRecevoir ?? 0)} sub="Impayés clients" color={(data?.aRecevoir ?? 0) > 0 ? 'red' : undefined} />
            <KPICard label="🔴 À payer" value={formatCurrency(data?.aPayer ?? 0)} sub="Impayés fournisseurs" color={(data?.aPayer ?? 0) > 0 ? 'red' : undefined} />
            <KPICard label="📦 Ventes" value={String(data?.nbVentes ?? 0)} sub="ce mois" />
            <KPICard label="📈 Marge" value={formatCurrency(data?.marge ?? 0)} sub="CA − Achats" color={(data?.marge ?? 0) < 0 ? 'red' : (data?.marge ?? 0) > 0 ? 'green' : undefined} />
          </div>

          {/* ── Alertes stock ── */}
          {(data?.stockAlerts ?? []).length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-800">⚠️ Alertes stock</p>
              <div className="space-y-1">
                {data!.stockAlerts.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-sm cursor-pointer hover:underline"
                    onClick={() => navigate('/products')}
                  >
                    <span className="font-medium">
                      {a.status === 'rupture' ? '🔴' : '🟡'} {a.name}
                    </span>
                    <span className="text-muted-foreground">
                      {a.status === 'rupture'
                        ? 'Rupture (stock : 0)'
                        : `Faible (stock : ${a.quantity} / seuil : ${a.stock_alert})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Graphiques ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Évolution ventes par jour */}
            <ChartCard
              title="📈 Évolution ventes / jour"
              empty={(data?.ventesParJour ?? []).every(d => d.total === 0)}
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.ventesParJour} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                    width={36}
                  />
                  <Tooltip content={<TooltipMAD />} />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top 5 produits */}
            <ChartCard title="🏆 Top 5 produits" empty={(data?.top5Produits ?? []).length === 0}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  layout="vertical"
                  data={data?.top5Produits}
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total']} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top 5 clients */}
            <ChartCard title="👥 Top 5 clients" empty={(data?.top5Clients ?? []).length === 0}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  layout="vertical"
                  data={data?.top5Clients}
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total']} />
                  <Bar dataKey="total" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Répartition ventes par produit */}
            <ChartCard title="🥧 Répartition par produit" empty={(data?.repartitionProduits ?? []).length === 0}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data?.repartitionProduits}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine
                  >
                    {(data?.repartitionProduits ?? []).map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total']} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
