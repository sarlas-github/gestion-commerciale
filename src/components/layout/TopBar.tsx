import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { usePageContext } from '@/contexts/PageContext'

interface TopBarProps {
  onMenuOpen: () => void
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
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

const getEmailInitials = (email: string): string => {
  const local = email.split('@')[0] ?? ''
  return local.slice(0, 2).toUpperCase()
}

export const TopBar = ({ onMenuOpen }: TopBarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const { action, leftAction, title: contextTitle, subtitle: contextSubtitle } = usePageContext()

  const getPageTitle = () => {
    const exactMatch = pageTitles[location.pathname]
    if (exactMatch) return exactMatch
    const prefix = Object.keys(pageTitles)
      .filter((k) => location.pathname.startsWith(k) && k !== '/')
      .sort((a, b) => b.length - a.length)[0]
    return prefix ? pageTitles[prefix] : 'Gestion Commerciale'
  }

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
    navigate('/login')
  }

  const email: string = user?.email ?? ''
  const initials = email ? getEmailInitials(email) : ''

  const displayTitle = contextTitle || getPageTitle()

  return (
    <header className="flex h-16 items-center gap-2 border-b bg-card px-4 lg:px-6 shrink-0 shadow-sm z-10">
      {/* Hamburger mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={onMenuOpen}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Ouvrir le menu</span>
      </Button>

      {/* Titre & Sous-titre */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="hidden md:block">
          {leftAction}
        </div>
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate">
            {displayTitle}
          </h1>
          {contextSubtitle && (
            <p className="hidden sm:block text-[0.8rem] text-muted-foreground leading-none mt-1 truncate">
              {contextSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* CTA Action + Avatar — shrink-0 pour ne jamais être écrasés */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Bouton principal de la page courante */}
        {action}
        
        <div className="md:hidden">
          {leftAction}
        </div>

        {/* Avatar / compte */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center rounded-full transition-transform hover:scale-105 outline-none cursor-pointer shadow-sm shrink-0">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 px-2 py-2 border-b mb-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate leading-tight">
                  {email}
                </span>
              </div>
            </div>

            <DropdownMenuItem 
              onClick={handleSignOut} 
              variant="destructive" 
              className="cursor-pointer h-11 px-3 mt-1 font-medium"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
