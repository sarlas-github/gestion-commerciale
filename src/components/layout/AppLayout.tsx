import { useState, useEffect, useRef } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ScrollToTop } from './ScrollToTop'
import { useAuth } from '@/hooks/useAuth'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Building2, FileText, Palette, Percent } from 'lucide-react'
import { PageProvider } from '@/contexts/PageContext'
import { useCompany } from '@/hooks/useCompany'
import { DEFAULT_BRAND_COLOR } from '@/lib/constants'

const DEFAULT_COMPANY_NAME = 'votre-nom-entreprise'

export const AppLayout = () => {
  const { user, loading } = useAuth()
  const { data: company } = useCompany()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [setupModalOpen, setSetupModalOpen] = useState(false)
  const hasShownSetupModal = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (company !== undefined) {
      document.documentElement.style.setProperty('--primary', company?.couleur_marque || DEFAULT_BRAND_COLOR)
    }
  }, [company?.couleur_marque])

  useEffect(() => {
    if (!hasShownSetupModal.current && company !== undefined && company?.name === DEFAULT_COMPANY_NAME) {
      setSetupModalOpen(true)
      hasShownSetupModal.current = true
    }
  }, [company])

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
      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {/* Bandeau coloré */}
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold leading-snug">
                Avant de commencer
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Configurez votre entreprise
              </DialogDescription>
            </div>
          </div>

          {/* Corps */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ces informations apparaissent sur toutes vos factures et reçus et sont <strong className="text-foreground">figées au moment de la génération</strong> — les modifier après ne met pas à jour les anciens documents.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Building2, label: 'Nom d\'entreprise' },
                { icon: FileText,  label: 'Logo' },
                { icon: Palette,   label: 'Couleur de marque' },
                { icon: Percent,   label: 'Taux de TVA' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/20">
            <Button variant="ghost" size="sm" onClick={() => setSetupModalOpen(false)}>
              Plus tard
            </Button>
            <Button size="sm" onClick={() => { setSetupModalOpen(false); navigate('/settings') }}>
              Aller aux Paramètres →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          <main id="main-scroll" className="flex-1 overflow-y-auto p-4 lg:p-4">
            <ScrollToTop />
            <Outlet />
          </main>
        </div>
      </div>
    </PageProvider>
  )
}
