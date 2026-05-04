import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'

// Pages Auth
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

// Pages Setup
import { SetupPage } from '@/pages/setup/SetupPage'

// Dashboard
import { Dashboard } from '@/pages/Dashboard'

// Products
import { ProductsPage } from '@/pages/products/ProductsPage'
import { ProductNewPage } from '@/pages/products/ProductNewPage'
import { ProductEditPage } from '@/pages/products/ProductEditPage'

// Stock
import { StockMovementsPage } from '@/pages/stock/StockMovementsPage'

// Suppliers
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage'
import { SupplierDetailPage } from '@/pages/suppliers/SupplierDetailPage'
import { SupplierNewPage } from '@/pages/suppliers/SupplierNewPage'
import { SupplierEditPage } from '@/pages/suppliers/SupplierEditPage'

// Purchases
import { PurchasesPage } from '@/pages/purchases/PurchasesPage'
import { PurchaseNewPage } from '@/pages/purchases/PurchaseNewPage'
import { PurchaseEditPage } from '@/pages/purchases/PurchaseEditPage'

// Clients
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage'
import { ClientNewPage } from '@/pages/clients/ClientNewPage'
import { ClientEditPage } from '@/pages/clients/ClientEditPage'

// Sales
import { SalesPage } from '@/pages/sales/SalesPage'
import { SaleNewPage } from '@/pages/sales/SaleNewPage'
import { SaleEditPage } from '@/pages/sales/SaleEditPage'
import { InvoicePreviewPage } from '@/pages/sales/InvoicePreviewPage'

// Documents
import { DocumentsPage } from '@/pages/documents/DocumentsPage'
import { DocumentDetailPage } from '@/pages/documents/DocumentDetailPage'

// Payments
import { ClientPaymentsPage } from '@/pages/payments/ClientPaymentsPage'
import { SupplierPaymentsPage } from '@/pages/payments/SupplierPaymentsPage'

// Reports
import { ClientReportsPage } from '@/pages/reports/ClientReportsPage'
import { SupplierReportsPage } from '@/pages/reports/SupplierReportsPage'

// Settings
import { SettingsPage } from '@/pages/settings/SettingsPage'

export const App = () => {
  return (
    <>
    <Toaster richColors position="bottom-right" />
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Routes protégées — via AppLayout (vérifie auth) */}
        <Route element={<AppLayout />}>
          {/* Redirect racine */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Setup */}
          <Route path="/setup" element={<SetupPage />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Produits */}
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductNewPage />} />
          <Route path="/products/:id/edit" element={<ProductEditPage />} />

          {/* Stock */}
          <Route path="/stock/movements" element={<StockMovementsPage />} />

          {/* Fournisseurs */}
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/suppliers/new" element={<SupplierNewPage />} />
          <Route path="/suppliers/:id/edit" element={<SupplierEditPage />} />
          <Route path="/suppliers/:id" element={<SupplierDetailPage />} />

          {/* Achats */}
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/purchases/new" element={<PurchaseNewPage />} />
          <Route path="/purchases/:id/edit" element={<PurchaseEditPage />} />

          {/* Clients */}
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/new" element={<ClientNewPage />} />
          <Route path="/clients/:id/edit" element={<ClientEditPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />

          {/* Ventes */}
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<SaleNewPage />} />
          <Route path="/sales/:id/edit" element={<SaleEditPage />} />
          <Route path="/sales/:id/invoice" element={<InvoicePreviewPage />} />

          {/* Documents */}
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />

          {/* Paiements */}
          <Route path="/payments/clients" element={<ClientPaymentsPage />} />
          <Route path="/payments/suppliers" element={<SupplierPaymentsPage />} />

          {/* États */}
          <Route path="/reports/clients" element={<ClientReportsPage />} />
          <Route path="/reports/suppliers" element={<SupplierReportsPage />} />

          {/* Paramètres */}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 → redirect dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}
