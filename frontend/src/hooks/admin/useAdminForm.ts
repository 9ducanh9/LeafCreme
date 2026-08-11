import { useCallback, useMemo, useState } from 'react'

export type FieldErrors = Record<string, string>
export type FieldWarnings = Record<string, string>

interface UseAdminFormOptions<T> {
  initialValues: T
  validate: (values: T) => FieldErrors
}

export function useAdminForm<T>({ initialValues, validate }: UseAdminFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isDirty, setIsDirty] = useState(false)
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => { const next = { ...current }; delete next[String(field)]; return next })
    setIsDirty(true)
  }, [])
  const setFieldError = useCallback((field: string, message: string) => setErrors((current) => ({ ...current, [field]: message })), [])
  const reset = useCallback((nextValues = initialValues) => { setValues(nextValues); setErrors({}); setIsDirty(false) }, [initialValues])
  const validateForm = useCallback(() => { const next = validate(values); setErrors(next); return Object.keys(next).length === 0 }, [validate, values])
  const fieldProps = useMemo(() => (field: keyof T) => ({ value: values[field], onChange: (value: T[typeof field]) => setValue(field, value), error: errors[String(field)] }), [errors, setValue, values])
  return { values, setValues, setValue, errors, setErrors, setFieldError, fieldProps, validateForm, reset, isDirty }
}
