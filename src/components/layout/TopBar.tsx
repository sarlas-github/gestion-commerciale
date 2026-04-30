import { useLocation } from 'react-router-dom'
import { Menu, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface TopBarProps {
  onMenuOpen: () => void
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/setup': 'Configuration entreprise',
  '/products': 'Produits',
  '/products/new': 'Nouveau produit',
  '/stock/movements': 'Mouvements stock',
  '/suppliers': 'Fournisseurs',
  '/purchases': 'Achats',
  '/purchases/new': 'Nouvel achat',
  '/clients': 'Clients',
  '/sales': 'Ventes',
  '/sales/new': 'Nouvelle vente',
  '/documents': 'Documents',
  '/payments/clients': 'Paiements clients',
  '/payments/suppliers': 'Paiements fournisseurs',
  '/reports/clients': 'État clients',
  '/reports/suppliers': 'État fournisseurs',
  '/settings': 'Paramètres',
}

export const TopBar = ({ onMenuOpen }: TopBarProps) => {
  const location = useLocation()

  const getPageTitle = () => {
    const exactMatch = pageTitles[location.pathname]
    if (exactMatch) return exactMatch

    const prefix = Object.keys(pageTitles)
      .filter((k) => location.pathname.startsWith(k) && k !== '/')
      .sort((a, b) => b.length - a.length)[0]

    return prefix ? pageTitles[prefix] : 'Gestion Commerciale'
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
      {/* Hamburger mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuOpen}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Ouvrir le menu</span>
      </Button>

      <Separator orientation="vertical" className="h-6 lg:hidden" />

      {/* Titre de la page */}
      <h1 className="text-base font-semibold">{getPageTitle()}</h1>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </header>
  )
}
