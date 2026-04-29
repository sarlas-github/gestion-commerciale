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
  X,
  Building2,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
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
      { label: 'Documents', href: '/documents', icon: FileText },
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
}

export const Sidebar = ({ onClose }: SidebarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Paiements', 'États'])

  const isActive = (href: string) => location.pathname.startsWith(href)

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    )
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      to={item.href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive(item.href)
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {item.badge}
        </span>
      ) : null}
    </Link>
  )

  return (
    <div className="flex h-full w-60 flex-col bg-card border-r">
      {/* En-tête */}
      <div className="flex items-center gap-3 px-4 py-4 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Mon Entreprise</p>
          <p className="text-xs text-muted-foreground">Gestion Commerciale</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {/* Dashboard */}
        <Link
          to="/dashboard"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive('/dashboard')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Dashboard</span>
        </Link>

        {/* Groupes de navigation */}
        {navGroups.map((group) => (
          <div key={group.title} className="pt-3">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}

        {/* FINANCES */}
        <div className="pt-3">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            FINANCES
          </p>
          <div className="space-y-0.5">
            {financesExpandable.map((section) => {
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
            })}
          </div>
        </div>

        {/* ADMIN */}
        <div className="pt-3">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            ADMIN
          </p>
          <Link
            to="/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive('/settings')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Paramètres</span>
          </Link>
        </div>
      </nav>

      {/* Pied de page */}
      <div className="border-t px-3 py-3">
        <Separator className="mb-3" />
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  )
}
