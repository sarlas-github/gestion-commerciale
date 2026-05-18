import { type ReactNode } from 'react'
import { usePageHeader } from '@/contexts/PageContext'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  leftAction?: ReactNode
}

export const PageHeader = ({ title, subtitle, actions, leftAction }: PageHeaderProps) => {
  usePageHeader({ title, subtitle, actions, leftAction })
  return null
}
