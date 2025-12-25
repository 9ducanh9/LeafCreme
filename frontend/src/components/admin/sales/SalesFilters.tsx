// Sales Filters component - filter by type, status, date range, amount range, search
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'

interface SalesFiltersProps {
  orderType: string
  status: string
  dateFrom: string
  dateTo: string
  amountFrom: string
  amountTo: string
  search: string
  onOrderTypeChange: (type: string) => void
  onStatusChange: (status: string) => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onAmountFromChange: (amount: string) => void
  onAmountToChange: (amount: string) => void
  onSearchChange: (search: string) => void
}

export default function SalesFilters({
  orderType,
  status,
  dateFrom,
  dateTo,
  amountFrom,
  amountTo,
  search,
  onOrderTypeChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onAmountFromChange,
  onAmountToChange,
  onSearchChange,
}: SalesFiltersProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        mb: 3,
        flexWrap: 'wrap',
        bgcolor: 'white',
        p: 2,
        borderRadius: 2,
        border: '1px solid #EFEDE6',
      }}
    >
      <TextField
        label="Tìm kiếm theo mã/khách hàng"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ flexGrow: 1, minWidth: 200 }}
      />

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Loại</InputLabel>
        <Select value={orderType} label="Loại" onChange={(e) => onOrderTypeChange(e.target.value)}>
          <MenuItem value="">Tất cả loại</MenuItem>
          <MenuItem value="online">Trực tuyến</MenuItem>
          <MenuItem value="pos">Tại cửa hàng</MenuItem>
          <MenuItem value="preorder">Đặt trước</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Trạng thái</InputLabel>
        <Select value={status} label="Trạng thái" onChange={(e) => onStatusChange(e.target.value)}>
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          <MenuItem value="pending">Chờ xử lý</MenuItem>
          <MenuItem value="processing">Đang xử lý</MenuItem>
          <MenuItem value="delivering">Đang giao</MenuItem>
          <MenuItem value="completed">Hoàn thành</MenuItem>
          <MenuItem value="canceled">Đã hủy</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Từ ngày"
        type="date"
        size="small"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 150 }}
      />

      <TextField
        label="Đến ngày"
        type="date"
        size="small"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 150 }}
      />

      <TextField
        label="Số tiền tối thiểu (VND)"
        type="number"
        size="small"
        value={amountFrom}
        onChange={(e) => onAmountFromChange(e.target.value)}
        sx={{ minWidth: 150 }}
        inputProps={{ min: 0 }}
      />

      <TextField
        label="Số tiền tối đa (VND)"
        type="number"
        size="small"
        value={amountTo}
        onChange={(e) => onAmountToChange(e.target.value)}
        sx={{ minWidth: 150 }}
        inputProps={{ min: 0 }}
      />
    </Box>
  )
}

