import { useState, useEffect } from 'react'

/**
 * Reads a CSS custom property value resolved by the browser.
 * Recharts uses SVG inline styles which don't support CSS vars natively,
 * so we must resolve them to actual color values via getComputedStyle.
 */
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export interface ChartColors {
  border: string
  mutedForeground: string
  primary: string
  card: string
  foreground: string
}

/**
 * Provides resolved CSS theme colors for use in Recharts props.
 * Automatically updates when the dark/light class changes on <html>.
 */
export function useChartColors(): ChartColors {
  const getColors = (): ChartColors => ({
    border: getCSSVar('--border') || '#e5e7eb',
    mutedForeground: getCSSVar('--muted-foreground') || '#6b7280',
    primary: getCSSVar('--primary') || '#6366f1',
    card: getCSSVar('--card') || '#ffffff',
    foreground: getCSSVar('--foreground') || '#111827',
  })

  const [colors, setColors] = useState<ChartColors>(getColors)

  useEffect(() => {
    // Update colors whenever the dark class is toggled
    const observer = new MutationObserver(() => {
      setColors(getColors())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    // Also update on mount in case state was loaded from localStorage
    setColors(getColors())
    return () => observer.disconnect()
  }, [])

  return colors
}
