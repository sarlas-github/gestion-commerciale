import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  actions?: ReactNode
}

export const PageHeader = ({ title, actions }: PageHeaderProps) => (
  <div className="flex items-center justify-between mb-6">
    <h1 className="text-2xl font-semibold">{title}</h1>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
)
