import { LayoutDashboard } from 'lucide-react'

export const Dashboard = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <LayoutDashboard className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="text-muted-foreground max-w-sm">
        Vue d'ensemble de votre activité commerciale. En cours de développement.
      </p>
    </div>
  )
}
