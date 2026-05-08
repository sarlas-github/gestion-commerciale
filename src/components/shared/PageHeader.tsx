import { useEffect, type ReactNode } from 'react'
import { usePageContext } from '@/contexts/PageContext'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  leftAction?: ReactNode
}

export const PageHeader = ({ title, subtitle, actions, leftAction }: PageHeaderProps) => {
  const { setTitle, setSubtitle, setAction, setLeftAction } = usePageContext()

  useEffect(() => {
    setTitle(title)
    if (subtitle) setSubtitle(subtitle)
    if (actions) setAction(actions)
    if (leftAction) setLeftAction(leftAction)

    return () => {
      setTitle('')
      if (subtitle) setSubtitle('')
      if (actions) setAction(null)
      if (leftAction) setLeftAction(null)
    }
  }, [title, subtitle, actions, leftAction, setTitle, setSubtitle, setAction, setLeftAction])

  // Le titre et les actions sont maintenant affichés dans la TopBar via le PageContext
  // On ne rend plus rien dans le container principal
  return null
}
