import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AutocompleteOption {
  id: string
  label: string
  /** Texte secondaire optionnel affiché en muted (ex: référence, code) */
  sublabel?: string
}

interface EntityAutocompleteProps {
  /** ID actuellement sélectionné (contrôlé par react-hook-form ou état parent) */
  value: string
  onChange: (id: string) => void
  options: AutocompleteOption[]
  placeholder?: string
  /** Callback pour ouvrir le modal de création */
  onAddNew?: () => void
  disabled?: boolean
  autoFocus?: boolean
  /**
   * 'sm' = h-8  → lignes produits dans le tableau
   * 'md' = h-9  → champs d'en-tête (fournisseur, client)
   * Défaut : 'sm'
   */
  size?: 'sm' | 'md'
  /** Message d'erreur affiché sous le champ quand l'user quitte sans sélection */
  errorMessage?: string
  /** Classe CSS additionnelle sur le wrapper */
  className?: string
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function EntityAutocomplete({
  value,
  onChange,
  options,
  placeholder = 'Rechercher...',
  onAddNew,
  disabled = false,
  autoFocus = false,
  size = 'sm',
  errorMessage,
  className = '',
}: EntityAutocompleteProps) {
  const getLabel = useCallback(
    (id: string) => options.find(o => o.id === id)?.label ?? '',
    [options]
  )

  const [inputValue, setInputValue] = useState(() => getLabel(value))
  const [isOpen, setIsOpen] = useState(false)
  const [localError, setLocalError] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Sync affichage quand la valeur ou les options changent (ex: après création)
  useEffect(() => {
    const label = getLabel(value)
    setInputValue(label)
    if (label) setLocalError(false)
  }, [value, getLabel])

  // ── Filtrage ───────────────────────────────────────────────────────────────

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(inputValue.toLowerCase()) ||
    (o.sublabel ?? '').toLowerCase().includes(inputValue.toLowerCase())
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setInputValue(text)
    setIsOpen(true)
    setHighlightedIdx(-1)
    // Si l'utilisateur modifie le texte alors qu'un item était sélectionné → reset
    if (value) {
      onChange('')
    }
  }

  const handleSelect = (option: AutocompleteOption) => {
    setInputValue(option.label)
    setIsOpen(false)
    setLocalError(false)
    setHighlightedIdx(-1)
    onChange(option.id)
  }

  const handleBlur = (e: React.FocusEvent) => {
    // Ignorer si le focus reste dans le container (clic sur liste ou bouton +)
    if (containerRef.current?.contains(e.relatedTarget as Node)) return

    setIsOpen(false)

    if (!value) {
      setLocalError(true)
      setInputValue('') // Nettoyer le texte non-sélectionné
    } else {
      setLocalError(false)
      setInputValue(getLabel(value)) // Restaurer le label correct
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIdx(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIdx >= 0 && filtered[highlightedIdx]) {
          handleSelect(filtered[highlightedIdx])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  // Scroll automatique de l'item surligné dans la liste
  useEffect(() => {
    if (highlightedIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIdx] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIdx])

  const hasError = localError && !value

  // Hauteurs selon le contexte d'utilisation
  const heightClass = size === 'md' ? 'h-9' : 'h-8'
  const btnHeightClass = size === 'md' ? 'h-9 w-9' : 'h-8 w-8'
  const shadowClass = size === 'md' ? 'shadow-sm' : ''

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 min-w-0 ${className}`}
      onBlur={handleBlur}
    >
      {/* Champ de saisie + bouton + */}
      <div className="flex gap-1.5 items-center">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            autoFocus={autoFocus}
            disabled={disabled}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              // On n'ouvre plus automatiquement pour éviter l'effet au chargement de la modal
              setHighlightedIdx(-1)
            }}
            onClick={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className={[
              // ── Layout ──────────────────────────────────────────────────
              `flex ${heightClass} w-full rounded-md border px-2 pr-7 text-sm`,
              // ── Fond transparent : hérite du bg-card parent (pas de fond blanc parasite) ──
              'bg-transparent',
              shadowClass,
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-1',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              // ── Bordure + ring selon état ────────────────────────────────
              hasError
                ? 'border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive'
                : 'border-input focus-visible:ring-ring',
            ].join(' ')}
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {onAddNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`${btnHeightClass} shrink-0`}
            title="Créer un nouvel élément"
            onMouseDown={(e) => {
              // Empêche le blur de l'input pour éviter que handleBlur ne se déclenche
              // et n'affiche l'erreur avant que l'utilisateur ait pu créer l'élément
              e.preventDefault()
            }}
            onClick={onAddNew}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Liste déroulante */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">
              Aucun résultat pour « {inputValue} »
            </div>
          ) : (
            filtered.map((option, i) => (
              <button
                key={option.id}
                type="button"
                className={[
                  'w-full text-left px-3 py-1.5 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  i === highlightedIdx ? 'bg-accent text-accent-foreground' : '',
                  option.id === value ? 'font-semibold text-primary' : '',
                ].join(' ')}
                onMouseDown={e => {
                  e.preventDefault() // Empêche le blur de l'input avant la sélection
                  handleSelect(option)
                }}
              >
                <span>{option.label}</span>
                {option.sublabel && (
                  <span className="ml-2 text-xs text-muted-foreground">{option.sublabel}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Message d'erreur */}
      {hasError && (
        <p className="text-xs text-destructive mt-0.5">
          {errorMessage ?? 'Sélectionnez un élément ou utilisez + pour en créer un'}
        </p>
      )}
    </div>
  )
}
