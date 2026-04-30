import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'

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

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export const TopBar = ({ onMenuOpen }: TopBarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()

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

  const displayName: string | null =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    null
  const initials = displayName ? getInitials(displayName) : ''

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

      {/* Compte utilisateur */}
      <div className="ml-auto flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted outline-none">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {displayName && (
              <span className="hidden sm:block max-w-[160px] truncate text-sm">
                {displayName}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Entête non-interactive : nom complet + email */}
            <div className="flex items-center gap-2 px-2 py-2 border-b mb-1">
              <Avatar size="sm">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate leading-tight">
                  {displayName ?? user?.email ?? '—'}
                </span>
                {user?.email && displayName !== user.email && (
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
