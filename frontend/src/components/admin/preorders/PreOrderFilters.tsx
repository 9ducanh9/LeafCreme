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
        label="Tìm kiếm theo tên/số điện thoại"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ flexGrow: 1, minWidth: 200 }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Trạng thái</InputLabel>
        <Select value={status} label="Trạng thái" onChange={(e) => onStatusChange(e.target.value)}>
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          <MenuItem value="pending">Chờ xử lý</MenuItem>
          <MenuItem value="confirmed">Đã xác nhận</MenuItem>
          <MenuItem value="preparing">Đang chuẩn bị</MenuItem>
          <MenuItem value="done">Hoàn thành</MenuItem>
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
    </Box>
  )
}

