import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'

interface PageSetters {
  setAction: (action: ReactNode) => void
  setLeftAction: (action: ReactNode) => void
  setTitle: (title: string) => void
  setSubtitle: (subtitle: string) => void
}

interface PageValues {
  action: ReactNode
  leftAction: ReactNode
  title: string
  subtitle: string
}

const PageSetterContext = createContext<PageSetters>({
  setAction: () => {},
  setLeftAction: () => {},
  setTitle: () => {},
  setSubtitle: () => {},
})

const PageValueContext = createContext<PageValues>({
  action: null,
  leftAction: null,
  title: '',
  subtitle: '',
})

export const PageProvider = ({ children }: { children: ReactNode }) => {
  const [action, setActionState] = useState<ReactNode>(null)
  const [leftAction, setLeftActionState] = useState<ReactNode>(null)
  const [title, setTitleState] = useState('')
  const [subtitle, setSubtitleState] = useState('')

  const setAction = useCallback((a: ReactNode) => setActionState(a), [])
  const setLeftAction = useCallback((a: ReactNode) => setLeftActionState(a), [])
  const setTitle = useCallback((t: string) => setTitleState(t), [])
  const setSubtitle = useCallback((s: string) => setSubtitleState(s), [])

  const setters = useMemo(
    () => ({ setAction, setLeftAction, setTitle, setSubtitle }),
    [setAction, setLeftAction, setTitle, setSubtitle]
  )

  const values = useMemo(
    () => ({ action, leftAction, title, subtitle }),
    [action, leftAction, title, subtitle]
  )

  return (
    <PageSetterContext.Provider value={setters}>
      <PageValueContext.Provider value={values}>
        {children}
      </PageValueContext.Provider>
    </PageSetterContext.Provider>
  )
}

/** Lire les valeurs courantes (TopBar) */
export const usePageContext = () => useContext(PageValueContext)

/** Écrire dans le contexte (pages, PageHeader) — stable, ne provoque pas de boucle */
const usePageSetters = () => useContext(PageSetterContext)

/**
 * Hook utilisé dans les pages pour enregistrer leur bouton CTA dans la TopBar.
 * N'abonne la page qu'aux setters (stables) → pas de boucle infinie.
 */
export const usePageAction = (action: ReactNode) => {
  const { setAction } = usePageSetters()
  useEffect(() => {
    setAction(action)
    return () => setAction(null)
  }, [action, setAction])
}

export const usePageHeader = ({
  title,
  subtitle,
  actions,
  leftAction,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  leftAction?: ReactNode
}) => {
  const { setTitle, setSubtitle, setAction, setLeftAction } = usePageSetters()

  useEffect(() => {
    setTitle(title)
    if (subtitle !== undefined) setSubtitle(subtitle)
    if (actions !== undefined) setAction(actions)
    if (leftAction !== undefined) setLeftAction(leftAction)

    return () => {
      setTitle('')
      setSubtitle('')
      setAction(null)
      setLeftAction(null)
    }
  }, [title, subtitle, actions, leftAction, setTitle, setSubtitle, setAction, setLeftAction])
}
