import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface PageContextValue {
  action: ReactNode
  setAction: (action: ReactNode) => void
  leftAction: ReactNode
  setLeftAction: (action: ReactNode) => void
  title: string
  setTitle: (title: string) => void
  subtitle: string
  setSubtitle: (subtitle: string) => void
}

const PageContext = createContext<PageContextValue>({
  action: null,
  setAction: () => {},
  leftAction: null,
  setLeftAction: () => {},
  title: '',
  setTitle: () => {},
  subtitle: '',
  setSubtitle: () => {},
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

  return (
    <PageContext.Provider value={{ action, setAction, leftAction, setLeftAction, title, setTitle, subtitle, setSubtitle }}>
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
