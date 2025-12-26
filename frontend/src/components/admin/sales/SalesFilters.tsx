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
  const filterStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      transition: 'all 0.2s ease',
      bgcolor: 'white',
      '& fieldset': {
        borderColor: 'rgba(122, 111, 99, 0.15)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(122, 111, 99, 0.3)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#C59B72',
      },
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
      fontWeight: 500,
      '&.Mui-focused': {
        color: '#C59B72',
      },
    },
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2.5,
        mb: 3,
        flexWrap: 'wrap',
        bgcolor: '#FAFAF9',
        p: 2.5,
        borderRadius: '16px',
        border: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <TextField
        label="Tìm kiếm theo mã/khách hàng"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Mã đơn hoặc tên khách..."
        sx={{ ...filterStyles, flexGrow: 1, minWidth: 220 }}
      />

      <FormControl size="small" sx={{ ...filterStyles, minWidth: 140 }}>
        <InputLabel>Loại</InputLabel>
        <Select value={orderType} label="Loại" onChange={(e) => onOrderTypeChange(e.target.value)}>
          <MenuItem value="">Tất cả loại</MenuItem>
          <MenuItem value="online">Trực tuyến</MenuItem>
          <MenuItem value="pos">Tại cửa hàng</MenuItem>
          <MenuItem value="preorder">Đặt trước</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ ...filterStyles, minWidth: 160 }}>
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
        slotProps={{ inputLabel: { shrink: true } }}
        placeholder="dd/mm/yyyy"
        sx={{ ...filterStyles, minWidth: 160 }}
      />

      <TextField
        label="Đến ngày"
        type="date"
        size="small"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        placeholder="dd/mm/yyyy"
        sx={{ ...filterStyles, minWidth: 160 }}
      />

      <TextField
        label="Từ số tiền"
        type="number"
        size="small"
        value={amountFrom}
        onChange={(e) => onAmountFromChange(e.target.value)}
        sx={{ ...filterStyles, minWidth: 140 }}
        inputProps={{ min: 0, step: 10000 }}
      />

      <TextField
        label="Đến số tiền"
        type="number"
        size="small"
        value={amountTo}
        onChange={(e) => onAmountToChange(e.target.value)}
        sx={{ ...filterStyles, minWidth: 140 }}
        inputProps={{ min: 0, step: 10000 }}
      />
    </Box>
  )
}

