import { PlaceholderPage } from '@/components/shared/PlaceholderPage'
import { Activity } from 'lucide-react'

export const StockMovementsPage = () => (
  <PlaceholderPage
    title="Mouvements stock"
    description="Historique de tous les mouvements de stock : entrées (IN), sorties (OUT) et corrections (ADJUST)."
    icon={Activity}
  />
)
