// Date input component with DD/MM/YYYY format for Vietnam
import { useState, useEffect } from 'react'

interface DateInputProps {
  id?: string
  name?: string
  value?: string // YYYY-MM-DD format
  onChange?: (value: string) => void // Returns YYYY-MM-DD format
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  label?: string
}

export default function DateInput({
  id,
  name,
  value = '',
  onChange,
  placeholder = 'dd/mm/yyyy',
  required = false,
  disabled = false,
  className = '',
  label,
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-')
      setDisplayValue(`${day}/${month}/${year}`)
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, '') // Remove non-digits
    
    // Format as DD/MM/YYYY while typing
    if (input.length >= 2) {
      input = input.substring(0, 2) + '/' + input.substring(2)
    }
    if (input.length >= 5) {
      input = input.substring(0, 5) + '/' + input.substring(5, 9)
    }
    
    setDisplayValue(input)

    // If complete date (DD/MM/YYYY), convert to YYYY-MM-DD and call onChange
    if (input.length === 10) {
      const [day, month, year] = input.split('/')
      const dateStr = `${year}-${month}-${day}`
      
      // Validate date
      const date = new Date(dateStr)
      if (date.toString() !== 'Invalid Date') {
        onChange?.(dateStr)
      }
    } else if (input.length === 0) {
      onChange?.('')
    }
  }

  const handleBlur = () => {
    // Validate on blur
    if (displayValue && displayValue.length === 10) {
      const [day, month, year] = displayValue.split('/')
      const dateStr = `${year}-${month}-${day}`
      const date = new Date(dateStr)
      
      if (date.toString() === 'Invalid Date') {
        setDisplayValue('')
        onChange?.('')
      }
    }
  }

  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-fg">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={id}
        name={name}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={10}
        className={className || 'h-11 w-full rounded-md border border-interactive bg-bg-surface px-4 text-fg outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus'}
      />
    </div>
  )
}

