# STACK.md — Stack Technique & Conventions

## Commande de création du projet
```bash
npm create vite@latest gestion-commerciale -- --template react-ts
cd gestion-commerciale
```

## Installation des dépendances
```bash
# Core
npm install react-router-dom
npm install @supabase/supabase-js

# UI
npm install tailwindcss @tailwindcss/vite
npm install @shadcn/ui
npx shadcn@latest init

# Formulaires & Validation
npm install react-hook-form zod @hookform/resolvers

# Tables
npm install @tanstack/react-table

# State serveur
npm install @tanstack/react-query

# Graphiques
npm install recharts

# PDF
npm install jspdf html2canvas

# Excel
npm install xlsx

# Icônes
npm install lucide-react

# Utilitaires
npm install date-fns
npm install clsx tailwind-merge
```

## Composants shadcn à installer
```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add card
npx shadcn@latest add dropdown-menu
npx shadcn@latest add alert
npx shadcn@latest add toast
npx shadcn@latest add separator
npx shadcn@latest add sheet
npx shadcn@latest add popover
npx shadcn@latest add calendar
npx shadcn@latest add command
npx shadcn@latest add skeleton
npx shadcn@latest add avatar
```

---

## Configuration Supabase (src/lib/supabase.ts)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Configuration React Query (src/main.tsx)
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})
```

---

## Utilitaires (src/lib/utils.ts)
```typescript
// Format monnaie MAD
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Format date
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR')
}

// Classes conditionnelles
export { clsx } from 'clsx'
```

---

## Pattern Hook Supabase
```typescript
// Exemple : useProducts.ts
export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (product: CreateProductInput) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

---

## Pattern DataTable réutilisable
Utiliser TanStack Table v8 avec :
- Pagination côté client (ou serveur si volume important)
- Tri par colonnes (indicateur ▲▼)
- Filtre/recherche temps réel
- Export Excel via SheetJS
- Colonnes configurables par page

---

## Gestion Auth
```typescript
// useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])
  
  return { user }
}
```

---

## Variables d'environnement (.env)
```
VITE_SUPABASE_URL=https://yirxzhazygrvymtfikap.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_YDEUU5wmwnsfBkMQvTlldA_DAvndiIG
```
