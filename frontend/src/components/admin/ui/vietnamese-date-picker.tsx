import { useEffect, useRef, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/vi'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

/** Date fields display Vietnamese dates while keeping ISO dates in application state. */
export default function VietnameseDatePicker({ value, onChange, label, disabled, required, error, helperText, size = 'medium' }: {
  value: string
  onChange: (value: string) => void
  label: string
  disabled?: boolean
  required?: boolean
  error?: boolean
  helperText?: string
  size?: 'small' | 'medium'
}) {
  const [draft, setDraft] = useState<Dayjs | null>(() => value ? dayjs(value) : null)
  const emitted = useRef(value)
  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value
      setDraft(value ? dayjs(value) : null)
    }
  }, [value])
  return <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
    <DatePicker label={label} value={draft} format="DD/MM/YYYY" disabled={disabled} onChange={(next) => {
      setDraft(next)
      const result = next?.isValid() ? next.format('YYYY-MM-DD') : ''
      emitted.current = result
      onChange(result)
    }} slotProps={{ textField: { fullWidth: true, required, error, helperText, size } }} />
  </LocalizationProvider>
}
