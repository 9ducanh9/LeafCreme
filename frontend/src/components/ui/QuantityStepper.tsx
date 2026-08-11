import { Minus, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  disabled?: boolean
  className?: string
}

export default function QuantityStepper({ value, onChange, min = 1, max, label = 'số lượng', disabled, className }: QuantityStepperProps) {
  const atMax = max !== undefined && value >= max
  const update = (next: number) => onChange(Math.min(max ?? Infinity, Math.max(min, next)))
  return <div className={cn('inline-flex items-center rounded-md border border-interactive bg-bg-surface', className)}>
    <button type="button" onClick={() => update(value - 1)} disabled={disabled || value <= min} className="grid size-11 place-items-center rounded-l-md text-fg-muted hover:bg-bg-subtle disabled:text-fg-disabled" aria-label={`Giảm ${label}`}><Minus className="size-4" aria-hidden /></button>
    <input type="text" inputMode="numeric" pattern="[0-9]*" role="spinbutton" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} value={value} disabled={disabled} onChange={(event) => { const next = Number.parseInt(event.target.value.replace(/\D/g, ''), 10); if (!Number.isNaN(next)) update(next) }} className="h-11 w-12 border-x border-interactive bg-transparent text-center text-base font-medium tabular-nums outline-none" />
    <button type="button" onClick={() => update(value + 1)} disabled={disabled || atMax} className="grid size-11 place-items-center rounded-r-md text-fg-muted hover:bg-bg-subtle disabled:text-fg-disabled" aria-label={`Tăng ${label}`}><Plus className="size-4" aria-hidden /></button>
    {atMax && <span className="sr-only">Đã đạt số lượng tối đa còn trong kho: {max}</span>}
  </div>
}
