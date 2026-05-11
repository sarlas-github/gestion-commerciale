import { useMemo, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { PeriodSelector } from '@/components/shared/PeriodSelector'
import { TableCell, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { useClientReport } from '@/hooks/useClientReport'
import { useAvailableYears } from '@/hooks/useAvailableYears'
import { formatCurrency } from '@/lib/utils'



type DebtFilter = 'all' | 'with_debt' | 'paid'

const DEBT_LABELS: Record<DebtFilter, string> = {
  all: 'Tous',
  with_debt: 'Avec dettes 🔴',
  paid: 'Soldés 🟢',
}

type ClientReportRow = {
  client_id: string
  client_name: string
  total_ventes: number
  total_paye: number
  reste: number
}

export const ClientReportsPage = () => {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(String(now.getFullYear()))
  const [month, setMonth] = useState(String(now.getMonth() + 1)) // '0' = tous les mois
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('all')
  const tableRef = useRef<HTMLDivElement>(null)

  const { data: availableYears = [now.getFullYear()] } = useAvailableYears('sales')
  const { data, isLoading } = useClientReport(Number(year), Number(month))
  const rows = (data?.rows ?? []) as ClientReportRow[]

  const filteredRows = useMemo(() => {
    if (debtFilter === 'with_debt') return rows.filter((r) => r.reste > 0)
    if (debtFilter === 'paid') return rows.filter((r) => r.reste === 0)
    return rows
  }, [rows, debtFilter])

  const filteredTotals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => ({
          total_ventes: acc.total_ventes + r.total_ventes,
          total_paye: acc.total_paye + r.total_paye,
          reste: acc.reste + r.reste,
        }),
        { total_ventes: 0, total_paye: 0, reste: 0 }
      ),
    [filteredRows]
  )

  const periodSlug = month === '0' || month === '' ? `${year}` : `M${month}-${year}`

  const columns = useMemo<ColumnDef<ClientReportRow>[]>(
    () => [
      {
        accessorKey: 'client_name',
        header: 'Client',
        cell: ({ row }) => (
          <button
            className="flex items-center gap-1 text-primary hover:underline text-sm font-medium"
            onClick={() => navigate(`/clients/${row.original.client_id}`)}
          >
            <Link2 className="h-3.5 w-3.5" />
            {row.original.client_name}
          </button>
        ),
      },
      {
        accessorKey: 'total_ventes',
        header: 'Total ventes',
        cell: ({ row }) => formatCurrency(row.original.total_ventes),
      },
      {
        accessorKey: 'total_paye',
        header: 'Payé',
        cell: ({ row }) => (
          <span className="text-green-600">{formatCurrency(row.original.total_paye)}</span>
        ),
      },
      {
        accessorKey: 'reste',
        header: 'Reste',
        cell: ({ row }) => (
          <span className={row.original.reste > 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-600'}>
            {formatCurrency(row.original.reste)}{' '}
            {row.original.reste > 0 ? '🔴' : '🟢'}
          </span>
        ),
      },
    ],
    [navigate]
  )

  const tableFooter = filteredRows.length > 0 ? (
    <TableRow>
      <TableCell className="font-bold">TOTAL</TableCell>
      <TableCell className="font-bold">{formatCurrency(filteredTotals.total_ventes)}</TableCell>
      <TableCell className="font-bold text-green-600">{formatCurrency(filteredTotals.total_paye)}</TableCell>
      <TableCell className={`font-bold ${filteredTotals.reste > 0 ? 'text-red-600' : 'text-green-600'}`}>
        {formatCurrency(filteredTotals.reste)}
      </TableCell>
    </TableRow>
  ) : undefined

  return (
    <div className="space-y-6">
      <PageHeader title="État clients" />

      {/* Sélecteurs période + filtre dettes */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector
          month={month}
          year={year}
          availableYears={availableYears}
          onMonthChange={setMonth}
          onYearChange={setYear}
          allowAllMonths={true}
        />

        {/* Filtre dettes */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-sm text-muted-foreground hidden sm:inline">Afficher :</span>
          <Select value={debtFilter} onValueChange={(v) => v && setDebtFilter(v as DebtFilter)}>
            <SelectTrigger size="sm" className="w-44">
              <span className="flex-1 text-left">{DEBT_LABELS[debtFilter]}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="with_debt">Avec dettes 🔴</SelectItem>
              <SelectItem value="paid">Soldés 🟢</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div ref={tableRef}>
        <DataTable
          columns={columns}
          data={filteredRows}
          isLoading={isLoading}
          exportFileName={`etat-clients-${periodSlug}`}
          exportMapper={(r) => ({
            Client: r.client_name,
            'Total ventes': r.total_ventes,
            Payé: r.total_paye,
            Reste: r.reste,
          })}
          defaultSorting={[{ id: 'client_name', desc: false }]}
          footer={tableFooter}
        />
      </div>

      {/* Total mobile uniquement (le footer du tableau gère le desktop) */}
      {filteredRows.length > 0 && (
        <div className="sm:hidden rounded-lg border bg-card px-4 py-3 space-y-1 text-sm font-bold">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-normal">Total ventes</span>
            <span>{formatCurrency(filteredTotals.total_ventes)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-normal">Payé</span>
            <span className="text-green-600">{formatCurrency(filteredTotals.total_paye)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-normal">Reste</span>
            <span className={filteredTotals.reste > 0 ? 'text-red-600' : 'text-green-600'}>
              {formatCurrency(filteredTotals.reste)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
