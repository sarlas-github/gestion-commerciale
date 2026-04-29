import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, FileDown, Sheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { useClientReport } from '@/hooks/useClientReport'
import { formatCurrency } from '@/lib/utils'

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const ClientReportsPage = () => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const tableRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useClientReport(year, month)
  const rows = data?.rows ?? []
  const totals = data?.totals ?? { total_ventes: 0, total_paye: 0, reste: 0 }

  const prev = () => month === 1 ? (setYear(y => y - 1), setMonth(12)) : setMonth(m => m - 1)
  const next = () => month === 12 ? (setYear(y => y + 1), setMonth(1)) : setMonth(m => m + 1)

  const exportExcel = () => {
    const exportData = [
      ...rows.map(r => ({
        Client: r.client_name,
        'Total ventes': r.total_ventes,
        'Payé': r.total_paye,
        'Reste': r.reste,
      })),
      { Client: 'TOTAL', 'Total ventes': totals.total_ventes, 'Payé': totals.total_paye, 'Reste': totals.reste },
    ]
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'État clients')
    XLSX.writeFile(wb, `etat-clients-${MONTHS_FR[month - 1]}-${year}.xlsx`)
  }

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
    pdf.text(`État clients — ${MONTHS_FR[month - 1]} ${year}`, 10, 12)
    pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight)
    pdf.save(`etat-clients-${MONTHS_FR[month - 1]}-${year}.pdf`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="État clients"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={rows.length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={rows.length === 0}>
              <Sheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        }
      />

      {/* MonthPicker */}
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

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Aucune vente pour cette période.
          </div>
        ) : (
          <div ref={tableRef} className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium text-right">Total ventes</th>
                  <th className="pb-3 font-medium text-right">Payé</th>
                  <th className="pb-3 font-medium text-right">Reste</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => (
                  <tr key={r.client_id}>
                    <td className="py-3 font-medium">{r.client_name}</td>
                    <td className="py-3 text-right">{formatCurrency(r.total_ventes)}</td>
                    <td className="py-3 text-right text-green-600">{formatCurrency(r.total_paye)}</td>
                    <td className="py-3 text-right">
                      <span className={r.reste > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                        {formatCurrency(r.reste)} {r.reste > 0 ? '🔴' : '🟢'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-foreground/20 font-bold">
                  <td className="pt-3">TOTAL</td>
                  <td className="pt-3 text-right">{formatCurrency(totals.total_ventes)}</td>
                  <td className="pt-3 text-right">{formatCurrency(totals.total_paye)}</td>
                  <td className="pt-3 text-right">{formatCurrency(totals.reste)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
