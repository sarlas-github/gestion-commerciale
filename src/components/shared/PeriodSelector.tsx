import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

export interface PeriodSelectorProps {
  month: string
  year: string
  availableYears: number[] | string[]
  onMonthChange: (month: string) => void
  onYearChange: (year: string) => void
  allowAllMonths?: boolean
  allMonthsLabel?: string
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const PeriodSelector = ({
  month,
  year,
  availableYears,
  onMonthChange,
  onYearChange,
  allowAllMonths = false,
  allMonthsLabel = 'Tous les mois',
}: PeriodSelectorProps) => {
  // Always use "0" internally for "all months" to satisfy Shadcn Select 
  // which behaves better with non-empty string values.
  const selectMonthValue = month === '' ? '0' : month
  
  const handleMonthChange = (val: string) => {
    // If we receive "0", the consumer either expects "0" or "", let's just pass "0"
    // Consumer should treat "0" or "" as "all months".
    onMonthChange(val)
  }

  return (
    <>
      <Select value={String(year)} onValueChange={(v) => v !== null && onYearChange(v)}>
        <SelectTrigger size="sm" className="w-24 bg-card h-9">
          <span className="flex-1 text-left">{year}</span>
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectMonthValue} onValueChange={(v) => v !== null && handleMonthChange(v)}>
        <SelectTrigger size="sm" className="w-40 bg-card h-9">
          <span className="flex-1 text-left">
            {selectMonthValue === '0' && allowAllMonths ? allMonthsLabel : MONTHS_FR[Number(selectMonthValue) - 1]}
          </span>
        </SelectTrigger>
        <SelectContent>
          {allowAllMonths && <SelectItem value="0">{allMonthsLabel}</SelectItem>}
          {MONTHS_FR.map((m, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
