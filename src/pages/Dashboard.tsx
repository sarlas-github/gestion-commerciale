import { useState } from 'react'

import {
  Loader2, Banknote, ShoppingCart, TrendingUp, Package, Wallet, Activity, Scale,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ResponsiveContainer,
  AreaChart, Area, CartesianGrid, XAxis, YAxis,
  BarChart, Bar,
  PieChart, Pie, Cell,
  Tooltip,
} from 'recharts'

import { PeriodSelector } from '@/components/shared/PeriodSelector'
import { useDashboard } from '@/hooks/useDashboard'
import { useAvailableYears } from '@/hooks/useAvailableYears'
import { useChartColors } from '@/hooks/useChartColors'
import { formatCurrency, cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'


// ── Constantes ────────────────────────────────────────────────────────────────



const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

// ── Sous-composants ───────────────────────────────────────────────────────────

const KPICard = ({
  label,
  value,
  sub,
  color,
  icon: Icon
}: {
  label: string
  value: string
  sub: string
  color?: 'red' | 'green' | 'blue' | 'purple'
  icon: React.ElementType
}) => (
  <div className={cn(
    'relative overflow-hidden rounded-xl border bg-card p-3 sm:p-5 transition-all duration-300 hover:shadow-md group',
    color === 'red' && 'border-red-200 dark:border-red-900/50',
    color === 'green' && 'border-green-200 dark:border-green-900/50',
    color === 'blue' && 'border-blue-200 dark:border-blue-900/50',
    color === 'purple' && 'border-purple-200 dark:border-purple-900/50',
  )}>
    <div className="flex items-center justify-between">
      <div className="space-y-1 sm:space-y-2 relative z-10 min-w-0 sm:pr-12">
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
        <p className={cn(
          'text-base sm:text-3xl font-bold tracking-tight truncate',
          color === 'red' && 'text-red-600 dark:text-red-500',
          color === 'green' && 'text-green-600 dark:text-green-500',
          color === 'blue' && 'text-blue-600 dark:text-blue-500',
          color === 'purple' && 'text-purple-600 dark:text-purple-500',
        )}>
          {value}
        </p>
        <p className="hidden sm:block text-[11px] sm:text-xs text-muted-foreground/80 font-medium">{sub}</p>
      </div>
      <div className={cn(
        "hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-3 transition-transform duration-300 group-hover:scale-110",
        !color && 'bg-primary/10 text-primary',
        color === 'red' && 'bg-red-50 text-red-500 dark:bg-red-950/50',
        color === 'green' && 'bg-green-50 text-green-500 dark:bg-green-950/50',
        color === 'blue' && 'bg-blue-50 text-blue-500 dark:bg-blue-950/50',
        color === 'purple' && 'bg-purple-50 text-purple-500 dark:bg-purple-950/50',
      )}>
        <Icon className="h-6 w-6 opacity-80" strokeWidth={2} />
      </div>
    </div>
  </div>
)

const ChartCard = ({
  title,
  children,
  empty,
  emptyText = 'Aucune donnée',
}: {
  title: string
  children: React.ReactNode
  empty?: boolean
  emptyText?: string
}) => (
  <div className="rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md space-y-4">
    <h3 className="text-sm font-bold tracking-wide text-foreground uppercase">{title}</h3>
    {empty ? (
      <div className="flex h-48 items-center justify-center text-sm font-medium text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
        {emptyText}
      </div>
    ) : children}
  </div>
)

// Tooltip adapté : "Jour X" en vue mensuelle, nom du mois en vue annuelle
const TooltipMAD = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; color: string; name: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const isNumeric = !isNaN(Number(label))
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md space-y-0.5">
      <p className="font-medium mb-1">{isNumeric ? `Jour ${label}` : label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name} : {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export const Dashboard = () => {
  const now = new Date()
  const [year, setYear] = useState(String(now.getFullYear()))
  const [month, setMonth] = useState(String(now.getMonth() + 1)) // '0' = toute l'année
  const [showDetails, setShowDetails] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const chartColors = useChartColors()

  const { data: availableYears = [now.getFullYear()] } = useAvailableYears('sales')
  const { data, isLoading } = useDashboard(Number(year), Number(month))

  const isYearView = month === '0' || month === ''
  const periodSub = isYearView ? "cette année" : "ce mois"

  return (
    <div className="space-y-6">
      {/* ── Sélecteurs période ── */}
      <div className="flex items-center gap-2">
        <PeriodSelector
          month={month}
          year={year}
          availableYears={availableYears}
          onMonthChange={setMonth}
          onYearChange={setYear}
          allowAllMonths={true}
        />
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="space-y-4 mb-8">
            {/* Résumé (Performance) - Toujours visible */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="col-span-2 lg:col-span-1">
                <KPICard
                  label="Marge brute"
                  value={formatCurrency(data?.marge ?? 0)}
                  sub={`CA − Achats ${periodSub}`}
                  color={(data?.marge ?? 0) < 0 ? 'red' : (data?.marge ?? 0) > 0 ? 'green' : undefined}
                  icon={TrendingUp}
                />
              </div>
              <KPICard
                label="Trésorerie"
                value={formatCurrency((data?.encaisse ?? 0) - (data?.decaisse ?? 0))}
                sub={`Encaissé − Décaissé ${periodSub}`}
                color={((data?.encaisse ?? 0) - (data?.decaisse ?? 0)) < 0 ? 'red' : ((data?.encaisse ?? 0) - (data?.decaisse ?? 0)) > 0 ? 'green' : undefined}
                icon={Scale}
              />
              <KPICard
                label="Volume ventes"
                value={String(data?.nbVentes ?? 0)}
                sub={`Factures ${periodSub}`}
                icon={Package}
              />
            </div>

            {/* Bouton pour basculer les détails */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground transition-all"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Masquer les détails de calcul
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Voir les détails de calcul
                  </>
                )}
              </Button>
            </div>

            {/* Détails (Ventes + Achats) - Collapsible */}
            {showDetails && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Ventes */}
                <div className="col-span-2 lg:col-span-1">
                  <KPICard label="CA Ventes" value={formatCurrency(data?.ca ?? 0)} sub={`Total facturé ${periodSub}`} icon={Banknote} color="blue" />
                </div>
                <KPICard label="Encaissé" value={formatCurrency(data?.encaisse ?? 0)} sub={`Reçu des clients ${periodSub}`} color="green" icon={TrendingUp} />
                <KPICard label="À recevoir" value={formatCurrency(data?.aRecevoir ?? 0)} sub="Impayés clients" color={(data?.aRecevoir ?? 0) > 0 ? 'red' : 'green'} icon={Activity} />

                {/* Achats */}
                <div className="col-span-2 lg:col-span-1">
                  <KPICard label="Total Achats" value={formatCurrency(data?.totalAchats ?? 0)} sub={`Dépenses engagées ${periodSub}`} icon={ShoppingCart} color="purple" />
                </div>
                <KPICard label="Décaissé" value={formatCurrency(data?.decaisse ?? 0)} sub={`Payé aux fournisseurs ${periodSub}`} color="green" icon={Wallet} />
                <KPICard label="À payer" value={formatCurrency(data?.aPayer ?? 0)} sub="Dettes fournisseurs" color={(data?.aPayer ?? 0) > 0 ? 'red' : 'green'} icon={Activity} />
              </div>
            )}
          </div>



          {/* ── Graphiques ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Évolution ventes vs achats */}
            <ChartCard
              title={isYearView ? '📈 Ventes & achats / mois' : '📈 Ventes & achats / jour'}
              empty={
                (data?.ventesParJour ?? []).every(d => d.total === 0) &&
                (data?.achatsParJour ?? []).every(d => d.total === 0)
              }
              emptyText={`Aucune donnée ${periodSub}`}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-5 rounded-sm" style={{ backgroundColor: chartColors.primary }} />
                    Ventes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-5 rounded-sm bg-orange-400" />
                    Achats
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={(data?.ventesParJour ?? []).map((v, i) => ({
                      day: v.day,
                      ventes: v.total,
                      achats: data?.achatsParJour?.[i]?.total ?? 0,
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAchats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb923c" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.border} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: chartColors.mutedForeground }}
                      tickLine={false}
                      axisLine={false}
                      interval={isYearView ? 0 : 4}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: chartColors.mutedForeground }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                      width={40}
                    />
                    <Tooltip content={<TooltipMAD />} />
                    <Area type="monotone" dataKey="ventes" name="Ventes" stroke={chartColors.primary} strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentes)" />
                    <Area type="monotone" dataKey="achats" name="Achats" stroke="#fb923c" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAchats)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Top 5 produits */}
            <ChartCard
              title="🏆 Top 5 produits"
              empty={(data?.top5Produits ?? []).length === 0}
              emptyText={`Aucune donnée ${periodSub}`}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  layout="vertical"
                  data={data?.top5Produits}
                  margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.border} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: chartColors.mutedForeground }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: chartColors.mutedForeground }} tickLine={false} axisLine={false} width={100} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total']} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="total" fill={chartColors.primary} radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Top 5 clients */}
            <ChartCard
              title="👥 Top 5 clients"
              empty={(data?.top5Clients ?? []).length === 0}
              emptyText={`Aucune donnée ${periodSub}`}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  layout="vertical"
                  data={data?.top5Clients}
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.border} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: chartColors.mutedForeground }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: chartColors.mutedForeground }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total']} />
                  <Bar dataKey="total" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Répartition ventes par produit */}
            <ChartCard
              title="🥧 Répartition par produit"
              empty={(data?.repartitionProduits ?? []).length === 0}
              emptyText={`Aucune donnée ${periodSub}`}
            >
              <div className="flex flex-col gap-3">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data?.repartitionProduits}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 75 : 85}
                    >
                      {(data?.repartitionProduits ?? []).map((_, i) => (
                        <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Total']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {(data?.repartitionProduits ?? []).map((item: { name: string; value: number }, i: number) => {
                    const total = (data?.repartitionProduits ?? []).reduce((s: number, d: { value: number }) => s + d.value, 0)
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                    return (
                      <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="max-w-[120px] truncate">{item.name}</span>
                        <span className="font-semibold text-foreground">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}





