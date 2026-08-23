// Orders Filters — lọc theo trạng thái, khoảng ngày, khoảng tiền, tìm kiếm.
// Lọc theo loại đơn nằm ở Tabs trên AdminOrdersPage, không lặp lại ở đây.
import { useEffect, useState } from 'react'
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import type { OrderStatus } from '../../../types/admin'
import { ORDER_STATUS_LABEL } from '../../../config/orderLabels'
import { useDebouncedCallback } from '../../../hooks/admin/useDebouncedCallback'
import { ADMIN_SEARCH_FIELD_ID } from '../ui/data-table-toolbar'

interface OrdersFiltersProps {
  status: OrderStatus | ''
  dateFrom: string
  dateTo: string
  amountFrom: string
  amountTo: string
  search: string
  onStatusChange: (status: OrderStatus | '') => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onAmountFromChange: (amount: string) => void
  onAmountToChange: (amount: string) => void
  onSearchChange: (search: string) => void
}

function useDebouncedTextField(value: string, onChange: (value: string) => void) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  const debouncedChange = useDebouncedCallback(onChange, 400)
  return { value: local, onChange: (next: string) => { setLocal(next); debouncedChange(next) } }
}

export default function OrdersFilters({
  status,
  dateFrom,
  dateTo,
  amountFrom,
  amountTo,
  search,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onAmountFromChange,
  onAmountToChange,
  onSearchChange,
}: OrdersFiltersProps) {
  const searchField = useDebouncedTextField(search, onSearchChange)
  const amountFromField = useDebouncedTextField(amountFrom, onAmountFromChange)
  const amountToField = useDebouncedTextField(amountTo, onAmountToChange)

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', bgcolor: 'background.paper', p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <TextField
        id={ADMIN_SEARCH_FIELD_ID}
        label="Tìm theo mã đơn"
        variant="outlined"
        size="small"
        value={searchField.value}
        onChange={(e) => searchField.onChange(e.target.value)}
        placeholder="VD: POS-2026..."
        sx={{ flexGrow: 1, minWidth: 220 }}
      />

      <FormControl size="small" sx={{ minWidth: 170 }}>
        <InputLabel>Trạng thái</InputLabel>
        <Select value={status} label="Trạng thái" onChange={(e) => onStatusChange(e.target.value as OrderStatus | '')}>
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
            <MenuItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Từ ngày" type="date" size="small" value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 160 }}
      />
      <TextField
        label="Đến ngày" type="date" size="small" value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 160 }}
      />
      <TextField
        label="Từ số tiền" type="number" size="small" value={amountFromField.value}
        onChange={(e) => amountFromField.onChange(e.target.value)}
        sx={{ minWidth: 140 }} inputProps={{ min: 0, step: 10000 }}
      />
      <TextField
        label="Đến số tiền" type="number" size="small" value={amountToField.value}
        onChange={(e) => amountToField.onChange(e.target.value)}
        sx={{ minWidth: 140 }} inputProps={{ min: 0, step: 10000 }}
      />
    </Box>
  )
}
