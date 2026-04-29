import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
  icon?: LucideIcon
}

export const PlaceholderPage = ({
  title,
  description,
  icon: Icon = Construction,
}: PlaceholderPageProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground max-w-sm">
          {description ?? 'Cette page est en cours de développement.'}
        </p>
      </div>
    </div>
  )
}
