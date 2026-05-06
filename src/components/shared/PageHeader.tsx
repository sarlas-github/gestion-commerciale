import { useEffect, type ReactNode } from 'react'
import { usePageContext } from '@/contexts/PageContext'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => {
  const { setTitle, setSubtitle, setAction } = usePageContext()

  useEffect(() => {
    setTitle(title)
    if (subtitle) setSubtitle(subtitle)
    if (actions) setAction(actions)

    return () => {
      setTitle('')
      if (subtitle) setSubtitle('')
      if (actions) setAction(null)
    }
  }, [title, subtitle, actions, setTitle, setSubtitle, setAction])

  // Le titre et les actions sont maintenant affichés dans la TopBar via le PageContext
  // On ne rend plus rien dans le container principal
  return null
}
