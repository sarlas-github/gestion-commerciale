import { useMemo, useRef, useState } from 'react'
import { FileDown } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { useClientReport } from '@/hooks/useClientReport'
import { useAvailableYears } from '@/hooks/useAvailableYears'
import { formatCurrency } from '@/lib/utils'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

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
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 0 = tous les mois
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('all')
  const tableRef = useRef<HTMLDivElement>(null)

  const { data: availableYears = [now.getFullYear()] } = useAvailableYears('sales')
  const { data, isLoading } = useClientReport(year, month)
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

  const periodLabel = month === 0 ? `Année ${year}` : `${MONTHS_FR[month - 1]} ${year}`
  const periodSlug = month === 0 ? `${year}` : `${MONTHS_FR[month - 1]}-${year}`

  const exportPDF = async () => {
    const el = tableRef.current
    if (!el) return
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const imgWidth = pageWidth - 20
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    pdf.setFontSize(14)
    pdf.text(`État clients — ${periodLabel}`, 10, 12)
    pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight)
    pdf.save(`etat-clients-${periodSlug}.pdf`)
  }

  const columns = useMemo<ColumnDef<ClientReportRow>[]>(
    () => [
      {
        accessorKey: 'client_name',
        header: 'Client',
        cell: ({ row }) => <span className="font-medium">{row.original.client_name}</span>,
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
    []
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
      <PageHeader
        title="État clients"
        actions={
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={filteredRows.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        }
      />

      {/* Sélecteurs période + filtre dettes */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Année */}
        <Select value={String(year)} onValueChange={(v) => v && setYear(Number(v))}>
          <SelectTrigger size="sm" className="w-24">
            <span className="flex-1 text-left">{year}</span>
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mois */}
        <Select value={String(month)} onValueChange={(v) => v !== null && setMonth(Number(v))}>
          <SelectTrigger size="sm" className="w-40">
            <span className="flex-1 text-left">
              {month === 0 ? 'Tous les mois' : MONTHS_FR[month - 1]}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Tous les mois</SelectItem>
            {MONTHS_FR.map((label, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre dettes */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground">Afficher :</span>
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
          searchPlaceholder="Rechercher un client..."
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
