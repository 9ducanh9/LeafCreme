// Suggestion chips for quick interactions with Leafie
import { Sparkles } from 'lucide-react'

interface LeafieSuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  disabled?: boolean
}

export default function LeafieSuggestionChips({
  suggestions,
  onSelect,
  disabled = false,
}: LeafieSuggestionChipsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => !disabled && onSelect(suggestion)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-button border border-border bg-surface-warm text-text-secondary hover:border-accent-brown hover:text-text-primary hover:bg-surface transition-default disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{suggestion}</span>
        </button>
      ))}
    </div>
  )
}

