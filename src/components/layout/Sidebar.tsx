import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Activity,
  Truck,
  ShoppingCart,
  Users,
  TrendingUp,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Building2,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useStockAlertCount } from '@/hooks/useProducts'
import { useCompany } from '@/hooks/useCompany'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

interface ExpandableNavItem {
  label: string
  icon: React.ElementType
  children: NavItem[]
}

// Navigation principale
const navGroups: NavGroup[] = [
  {
    title: 'CATALOGUE',
    items: [
      { label: 'Produits', href: '/products', icon: Package },
      { label: 'Mouvements stock', href: '/stock/movements', icon: Activity },
    ],
  },
  {
    title: 'ACHATS',
    items: [
      { label: 'Fournisseurs', href: '/suppliers', icon: Truck },
      { label: 'Achats', href: '/purchases', icon: ShoppingCart },
    ],
  },
  {
    title: 'VENTES',
    items: [
      { label: 'Clients', href: '/clients', icon: Users },
      { label: 'Ventes', href: '/sales', icon: TrendingUp },
      // { label: 'Documents', href: '/documents', icon: FileText }, // masqué
    ],
  },
]

const financesExpandable: ExpandableNavItem[] = [
  {
    label: 'Paiements',
    icon: CreditCard,
    children: [
      { label: 'Clients', href: '/payments/clients', icon: CreditCard },
      { label: 'Fournisseurs', href: '/payments/suppliers', icon: CreditCard },
    ],
  },
  {
    label: 'États',
    icon: BarChart3,
    children: [
      { label: 'État clients', href: '/reports/clients', icon: BarChart3 },
      { label: 'État fournisseurs', href: '/reports/suppliers', icon: BarChart3 },
    ],
  },
]

interface SidebarProps {
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const Sidebar = ({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { data: alertCount = 0 } = useStockAlertCount()
  const { data: company } = useCompany()
  const queryClient = useQueryClient()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Paiements', 'États'])

  const isActive = (href: string) => location.pathname.startsWith(href)

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    )
  }

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
    navigate('/login')
  }

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      to={item.href}
      onClick={onClose}
      title={collapsed ? item.label : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-2' : 'px-3',
        isActive(item.href)
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && item.badge && item.badge > 0 ? (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {item.badge}
        </span>
      ) : null}
      {collapsed && item.badge && item.badge > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {item.badge}
        </span>
      ) : null}
    </Link>
  )

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-card border-r transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* En-tête */}
      <div
        className={cn(
          'flex items-center gap-3 border-b py-4',
          collapsed ? 'justify-center px-2' : 'px-4'
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground overflow-hidden shrink-0">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-5 w-5" />
          )}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{company?.name ?? 'Mon Entreprise'}</p>
            <p className="text-xs text-muted-foreground">Gestion Commerciale</p>
          </div>
        )}
        {/* Bouton X sur mobile (drawer) */}
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
        {/* Bouton toggle collapse sur desktop */}
        {onToggleCollapse && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onToggleCollapse}>
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-3 space-y-1', collapsed ? 'px-2' : 'px-3')}>
        {/* Dashboard */}
        <Link
          to="/dashboard"
          onClick={onClose}
          title={collapsed ? 'Dashboard' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
            collapsed ? 'justify-center px-2' : 'px-3',
            isActive('/dashboard')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        {/* Groupes de navigation */}
        {navGroups.map((group) => (
          <div key={group.title} className="pt-3">
            {!collapsed ? (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.title}
              </p>
            ) : (
              <div className="mb-1 mx-1 h-px bg-border" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={
                    item.href === '/products' && alertCount > 0
                      ? { ...item, badge: alertCount }
                      : item
                  }
                />
              ))}
            </div>
          </div>
        ))}

        {/* FINANCES */}
        <div className="pt-3">
          {!collapsed ? (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              FINANCES
            </p>
          ) : (
            <div className="mb-1 mx-1 h-px bg-border" />
          )}
          <div className="space-y-0.5">
            {collapsed ? (
              // Mode réduit : icône directement vers le premier enfant
              financesExpandable.map((section) => (
                <Link
                  key={section.label}
                  to={section.children[0].href}
                  onClick={onClose}
                  title={section.label}
                  className={cn(
                    'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    section.children.some((c) => isActive(c.href))
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <section.icon className="h-4 w-4 shrink-0" />
                </Link>
              ))
            ) : (
              // Mode étendu : accordion
              financesExpandable.map((section) => {
                const isExpanded = expandedItems.includes(section.label)
                const hasActiveChild = section.children.some((c) => isActive(c.href))
                return (
                  <div key={section.label}>
                    <button
                      onClick={() => toggleExpand(section.label)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        hasActiveChild
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <section.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{section.label}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-3">
                        {section.children.map((child) => (
                          <Link
                            key={child.href}
                            to={child.href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                              isActive(child.href)
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ADMIN — masqué (false && pour réactiver : remplacer false par true) */}
        {/* {false && ( */}
        <div className="pt-3">
          {!collapsed ? (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              ADMIN
            </p>
          ) : (
            <div className="mb-1 mx-1 h-px bg-border" />
          )}
          <Link
            to="/settings"
            onClick={onClose}
            title={collapsed ? 'Paramètres' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-2' : 'px-3',
              isActive('/settings')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Paramètres</span>}
          </Link>
        </div>
        {/*  )} */}
      </nav>

      {/* Pied de page */}
      <div className={cn('border-t py-3', collapsed ? 'px-2' : 'px-3')}>
        <Separator className="mb-3" />
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Déconnexion' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed ? 'justify-center px-2' : 'px-3'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  )
}
