// Pre-order Filters component - filter by status, date range, search
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'

interface PreOrderFiltersProps {
  status: string
  dateFrom: string
  dateTo: string
  search: string
  onStatusChange: (status: string) => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onSearchChange: (search: string) => void
}

export default function PreOrderFilters({
  status,
  dateFrom,
  dateTo,
  search,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
}: PreOrderFiltersProps) {
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
        label="Tìm kiếm theo tên/số điện thoại"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Tên khách hoặc số điện thoại..."
        sx={{ ...filterStyles, flexGrow: 1, minWidth: 240 }}
      />

      <FormControl size="small" sx={{ ...filterStyles, minWidth: 160 }}>
        <InputLabel>Trạng thái</InputLabel>
        <Select value={status} label="Trạng thái" onChange={(e) => onStatusChange(e.target.value)}>
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          <MenuItem value="pending">Chờ xử lý</MenuItem>
          <MenuItem value="confirmed">Đang xử lý</MenuItem>
          <MenuItem value="preparing">Đang chuẩn bị</MenuItem>
          <MenuItem value="ready">Sẵn sàng</MenuItem>
          <MenuItem value="completed">Hoàn thành</MenuItem>
          <MenuItem value="cancelled">Đã hủy</MenuItem>
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
    </Box>
  )
}

