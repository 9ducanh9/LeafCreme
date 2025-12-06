// Input component - uses design tokens
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-input border border-border 
            bg-surface text-text-primary 
            placeholder:text-text-secondary
            focus:outline-none focus:border-accent-brown 
            transition-default
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-accent-pink' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-accent-pink">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input

