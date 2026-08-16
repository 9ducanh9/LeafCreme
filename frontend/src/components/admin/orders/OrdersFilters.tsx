// Orders Filters — lọc theo trạng thái, khoảng ngày, khoảng tiền, tìm kiếm.
// Lọc theo loại đơn nằm ở Tabs trên AdminOrdersPage, không lặp lại ở đây.
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import type { OrderStatus } from '../../../types/admin'
import { ORDER_STATUS_LABEL } from '../../../config/orderLabels'

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
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', bgcolor: 'background.paper', p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <TextField
        label="Tìm theo mã đơn"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
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
        label="Từ số tiền" type="number" size="small" value={amountFrom}
        onChange={(e) => onAmountFromChange(e.target.value)}
        sx={{ minWidth: 140 }} inputProps={{ min: 0, step: 10000 }}
      />
      <TextField
        label="Đến số tiền" type="number" size="small" value={amountTo}
        onChange={(e) => onAmountToChange(e.target.value)}
        sx={{ minWidth: 140 }} inputProps={{ min: 0, step: 10000 }}
      />
    </Box>
  )
}
