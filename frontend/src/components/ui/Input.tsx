import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, id: providedId, className, required, ...props }, ref) => {
  const generatedId = useId()
  const id = providedId || `${generatedId}-field`
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="mb-2 block text-sm font-medium text-fg">{label}{required && <span aria-hidden className="ml-1 text-danger">*</span>}</label>}
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn('h-11 w-full rounded-md border border-interactive bg-bg-surface px-4 text-base text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-fast outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:bg-bg-inset disabled:text-fg-disabled', error && 'border-danger focus-visible:ring-danger', className)}
        {...props}
      />
      {hint && <p id={hintId} className="mt-1.5 text-sm text-fg-subtle">{hint}</p>}
      {error && <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-danger">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
