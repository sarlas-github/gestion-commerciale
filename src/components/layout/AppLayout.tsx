import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ScrollToTop } from './ScrollToTop'
import { useAuth } from '@/hooks/useAuth'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { PageProvider } from '@/contexts/PageContext'
import { useCompany } from '@/hooks/useCompany'

export const AppLayout = () => {
  const { user, loading } = useAuth()
  const { data: company } = useCompany()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (company?.couleur_marque) {
      document.documentElement.style.setProperty('--primary', company.couleur_marque)
    }
  }, [company?.couleur_marque])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <PageProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex lg:shrink-0">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          />
        </aside>

        {/* Sidebar mobile (drawer) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-60" showCloseButton={false}>
            <Sidebar onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Contenu principal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar onMenuOpen={() => setMobileOpen(true)} />
          <main id="main-scroll" className="flex-1 overflow-y-auto p-4 lg:p-6">
            <ScrollToTop />
            <Outlet />
          </main>
        </div>
      </div>
    </PageProvider>
  )
}
