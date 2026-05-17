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
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useStockAlertCount } from '@/hooks/useProducts'
import { useUnpaidSuppliersCount } from '@/hooks/useSuppliers'
import { useUnpaidClientsCount } from '@/hooks/useClients'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'

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
    ],
  },
]

const financesExpandable: ExpandableNavItem[] = [
  {
    label: 'États',
    icon: BarChart3,
    children: [
      { label: 'État clients', href: '/reports/clients', icon: BarChart3 },
      { label: 'État fournisseurs', href: '/reports/suppliers', icon: BarChart3 },
    ],
  },
  {
    label: 'Paiements',
    icon: CreditCard,
    children: [
      { label: 'Clients', href: '/payments/clients', icon: CreditCard },
      { label: 'Fournisseurs', href: '/payments/suppliers', icon: CreditCard },
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
  const { data: unpaidSuppliers = 0 } = useUnpaidSuppliersCount()
  const { data: unpaidClients = 0 } = useUnpaidClientsCount()
  const queryClient = useQueryClient()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Paiements', 'États'])
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const root = document.documentElement
    const nextDark = !isDark
    if (nextDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    setIsDark(nextDark)
  }

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

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href)
    return (
      <Link
        to={item.href}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        className={cn(
          'relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-all duration-150',
          collapsed ? 'justify-center px-2' : 'px-3',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
        )}
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
  }

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
          'flex h-16 items-center gap-3 border-b',
          collapsed ? 'justify-center px-2' : 'px-4'
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground overflow-hidden shrink-0 shadow-sm p-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
            <path d="M75 35 A25 25 0 1 0 75 65" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            <path d="M50 25 L60 50 L50 75 L40 50 Z" fill="currentColor" transform="rotate(45 50 50)" />
          </svg>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold tracking-tight truncate">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground font-medium">Gestion Commerciale</p>
          </div>
        )}
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
        {onToggleCollapse && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onToggleCollapse}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
            'relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-all duration-150',
            collapsed ? 'justify-center px-2' : 'px-3',
            isActive('/dashboard')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {isActive('/dashboard') && !collapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
          )}
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Dashboard</span>}
        </Link>

        {/* Groupes */}
        {navGroups.map((group) => (
          <div key={group.title} className="pt-3">
            {!collapsed ? (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
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
                      : item.href === '/suppliers' && unpaidSuppliers > 0
                        ? { ...item, badge: unpaidSuppliers }
                        : item.href === '/clients' && unpaidClients > 0
                          ? { ...item, badge: unpaidClients }
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
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              FINANCES
            </p>
          ) : (
            <div className="mb-1 mx-1 h-px bg-border" />
          )}
          <div className="space-y-0.5">
            {collapsed ? (
              financesExpandable.map((section) => (
                <Link
                  key={section.label}
                  to={section.children[0].href}
                  onClick={onClose}
                  title={section.label}
                  className={cn(
                    'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-all duration-150',
                    section.children.some((c) => isActive(c.href))
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <section.icon className="h-4 w-4 shrink-0" />
                </Link>
              ))
            ) : (
              financesExpandable.map((section) => {
                const isExpanded = expandedItems.includes(section.label)
                const hasActiveChild = section.children.some((c) => isActive(c.href))
                return (
                  <div key={section.label}>
                    <button
                      onClick={() => toggleExpand(section.label)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
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
                              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all duration-150',
                              isActive(child.href)
                                ? 'bg-primary/10 text-primary font-medium'
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

        {/* CONFIGURATION */}
        <div className="pt-3">
          {!collapsed ? (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              CONFIGURATION
            </p>
          ) : (
            <div className="mb-1 mx-1 h-px bg-border" />
          )}
          <Link
            to="/settings"
            onClick={onClose}
            title={collapsed ? 'Paramètres' : undefined}
            className={cn(
              'relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-all duration-150',
              collapsed ? 'justify-center px-2' : 'px-3',
              isActive('/settings')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {isActive('/settings') && !collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
            )}
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Paramètres</span>}
          </Link>
          <Link
            to="/aide"
            onClick={onClose}
            title={collapsed ? 'Aide' : undefined}
            className={cn(
              'relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-all duration-150',
              collapsed ? 'justify-center px-2' : 'px-3',
              isActive('/aide')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {isActive('/aide') && !collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
            )}
            <HelpCircle className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Aide</span>}
          </Link>
        </div>
      </nav>

      {/* Pied de page — Toujours en bas */}
      <div className={cn('p-3 border-t space-y-1 bg-card', collapsed ? 'px-2' : 'px-3')}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (isDark ? 'Mode clair' : 'Mode sombre') : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground',
            collapsed ? 'justify-center px-2' : 'px-3'
          )}
        >
          {isDark
            ? <Sun className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>Mode {isDark ? 'clair' : 'sombre'}</span>}
        </button>

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Déconnexion' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground',
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
