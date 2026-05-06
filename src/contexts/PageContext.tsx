import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface PageContextValue {
  action: ReactNode
  setAction: (action: ReactNode) => void
  title: string
  setTitle: (title: string) => void
  subtitle: string
  setSubtitle: (subtitle: string) => void
}

const PageContext = createContext<PageContextValue>({
  action: null,
  setAction: () => {},
  title: '',
  setTitle: () => {},
  subtitle: '',
  setSubtitle: () => {},
})

export const PageProvider = ({ children }: { children: ReactNode }) => {
  const [action, setActionState] = useState<ReactNode>(null)
  const [title, setTitleState] = useState('')
  const [subtitle, setSubtitleState] = useState('')

  const setAction = useCallback((a: ReactNode) => setActionState(a), [])
  const setTitle = useCallback((t: string) => setTitleState(t), [])
  const setSubtitle = useCallback((s: string) => setSubtitleState(s), [])

  return (
    <PageContext.Provider value={{ action, setAction, title, setTitle, subtitle, setSubtitle }}>
      {children}
    </PageContext.Provider>
  )
}

export const usePageContext = () => useContext(PageContext)

/**
 * Hook utilisé dans les pages pour enregistrer leur bouton CTA dans la TopBar.
 */
export const usePageAction = (action: ReactNode) => {
  const { setAction } = usePageContext()
  useEffect(() => {
    setAction(action)
    return () => setAction(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
