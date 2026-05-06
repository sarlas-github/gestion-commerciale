import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Scrolls the main content area to the top on every route change.
 * Targets the <main id="main-scroll"> element added in AppLayout.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    const main = document.getElementById('main-scroll')
    if (main) {
      main.scrollTop = 0
    }
  }, [pathname])

  return null
}
