// ─── Types de base ────────────────────────────────────────────────────────────

export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
export type StockStatus = 'ok' | 'faible' | 'rupture'
export type StockMovementType = 'IN' | 'OUT' | 'ADJUST'
export type StockMovementReference = 'purchase' | 'sale' | 'manual'
export type ProductType = 'individual' | 'pack'
export type DocumentType = 'invoice' | 'receipt' | 'quote' | 'order' | 'delivery'
export type DocumentStatus = 'draft' | 'confirmed' | 'cancelled'

// ─── companies ────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  user_id: string
  name: string
  forme_juridique: string | null
  address: string | null
  phone: string | null
  email: string | null
  site_web: string | null
  ice: string | null
  if_number: string | null
  rc: string | null
  tp_number: string | null
  tva_number: string | null
  taux_tva_defaut: number
  logo_url: string | null
  couleur_marque: string
  created_at: string
  updated_at: string
}

export type CreateCompanyInput = Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateCompanyInput = Partial<CreateCompanyInput>

// ─── products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  user_id: string
  name: string
  type: ProductType
  pieces_count: number
  stock_alert: number
  created_at: string
  updated_at: string
}

export type CreateProductInput = Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateProductInput = Partial<CreateProductInput>

// ─── clients ──────────────────────────────────────────────────────────────────

export interface Client {
  id: string
  user_id: string
  name: string
  phone: string | null
  address: string | null
  ice: string | null
  created_at: string
  updated_at: string
}

export type CreateClientInput = Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateClientInput = Partial<CreateClientInput>

// ─── suppliers ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string
  user_id: string
  name: string
  phone: string | null
  address: string | null
  ice: string | null
  created_at: string
  updated_at: string
}

export type CreateSupplierInput = Omit<Supplier, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateSupplierInput = Partial<CreateSupplierInput>

// ─── stock ────────────────────────────────────────────────────────────────────

export interface Stock {
  id: string
  user_id: string
  product_id: string
  quantity: number
  updated_at: string
}

// ─── stock_movements ──────────────────────────────────────────────────────────

export interface StockMovement {
  id: string
  user_id: string
  product_id: string
  type: StockMovementType
  quantity: number
  reference_type: StockMovementReference
  reference_id: string | null
  note: string | null
  date: string
  created_at: string
  // Join
  products?: Pick<Product, 'id' | 'name'>
}

export type CreateStockMovementInput = Omit<StockMovement, 'id' | 'user_id' | 'created_at' | 'products'>

// ─── purchases ────────────────────────────────────────────────────────────────

export interface Purchase {
  id: string
  user_id: string
  supplier_id: string
  reference: string | null
  date: string
  total: number
  paid: number
  remaining: number
  status: PaymentStatus
  note: string | null
  created_at: string
  updated_at: string
  // Joins
  suppliers?: Pick<Supplier, 'id' | 'name'>
  purchase_items?: PurchaseItem[]
  supplier_payments?: SupplierPayment[]
}

export type CreatePurchaseInput = Omit<Purchase, 'id' | 'user_id' | 'remaining' | 'status' | 'created_at' | 'updated_at' | 'suppliers' | 'purchase_items' | 'supplier_payments'>

// ─── purchase_items ───────────────────────────────────────────────────────────

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  // Joins
  products?: Pick<Product, 'id' | 'name'>
}

export type CreatePurchaseItemInput = Omit<PurchaseItem, 'id' | 'subtotal' | 'products'>

// ─── supplier_payments ────────────────────────────────────────────────────────

export interface SupplierPayment {
  id: string
  user_id: string
  purchase_id: string
  amount: number
  date: string
  note: string | null
  created_at: string
  // Joins
  purchases?: Pick<Purchase, 'id' | 'reference'> & { suppliers?: Pick<Supplier, 'id' | 'name'> }
}

export type CreateSupplierPaymentInput = Omit<SupplierPayment, 'id' | 'user_id' | 'created_at' | 'purchases'>

// ─── sales ────────────────────────────────────────────────────────────────────

export interface Sale {
  id: string
  user_id: string
  client_id: string
  date: string
  total: number
  paid: number
  remaining: number
  status: PaymentStatus
  note: string | null
  created_at: string
  updated_at: string
  // Joins
  clients?: Pick<Client, 'id' | 'name'>
  sale_items?: SaleItem[]
  client_payments?: ClientPayment[]
}

export type CreateSaleInput = Omit<Sale, 'id' | 'user_id' | 'remaining' | 'status' | 'created_at' | 'updated_at' | 'clients' | 'sale_items' | 'client_payments'>

// ─── sale_items ───────────────────────────────────────────────────────────────

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  pieces_count: number
  unit_price: number
  subtotal: number
  // Joins
  products?: Pick<Product, 'id' | 'name'>
}

export type CreateSaleItemInput = Omit<SaleItem, 'id' | 'subtotal' | 'products'>

// ─── client_payments ─────────────────────────────────────────────────────────

export interface ClientPayment {
  id: string
  user_id: string
  sale_id: string
  amount: number
  date: string
  note: string | null
  created_at: string
  // Joins
  sales?: Pick<Sale, 'id'> & { clients?: Pick<Client, 'id' | 'name'> }
}

export type CreateClientPaymentInput = Omit<ClientPayment, 'id' | 'user_id' | 'created_at' | 'sales'>

// ─── documents ────────────────────────────────────────────────────────────────

export interface Document {
  id: string
  user_id: string
  client_id: string | null
  sale_id: string | null
  payment_id: string | null
  parent_id: string | null
  type: DocumentType
  number: string
  date: string
  status: DocumentStatus
  payment_status: PaymentStatus
  total: number
  paid: number
  remaining: number
  note: string | null
  // Snapshots client
  client_name: string | null
  client_address: string | null
  client_ice: string | null
  // Snapshots entreprise
  company_name: string | null
  company_address: string | null
  company_phone: string | null
  company_email: string | null
  company_ice: string | null
  company_if: string | null
  company_rc: string | null
  company_tp: string | null
  company_logo_url: string | null
  created_at: string
  updated_at: string
  // Joins
  document_items?: DocumentItem[]
}

// ─── document_items ───────────────────────────────────────────────────────────

export interface DocumentItem {
  id: string
  document_id: string
  product_id: string | null
  product_name: string
  quantity: number
  pieces_count: number
  unit_price: number
  subtotal: number
}

// ─── Types pour les formulaires ───────────────────────────────────────────────

export interface PurchaseFormData {
  supplier_id: string
  date: string
  reference: string
  note: string
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
  }>
  payments: Array<{
    date: string
    amount: number
    note: string
  }>
}

export interface SaleFormData {
  client_id: string
  date: string
  note: string
  items: Array<{
    product_id: string
    quantity: number
    pieces_count: number
    unit_price: number
  }>
  payments: Array<{
    date: string
    amount: number
    note: string
  }>
}

// ─── Types pour les vues enrichies ───────────────────────────────────────────

export interface ProductWithStock extends Product {
  stock: Stock | null
  stockStatus: StockStatus
}
