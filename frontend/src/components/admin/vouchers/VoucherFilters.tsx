// Voucher Filters component - filter by status, type, search
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'

interface VoucherFiltersProps {
  status: string
  type: string
  search: string
  onStatusChange: (status: string) => void
  onTypeChange: (type: string) => void
  onSearchChange: (search: string) => void
}

export default function VoucherFilters({
  status,
  type,
  search,
  onStatusChange,
  onTypeChange,
  onSearchChange,
}: VoucherFiltersProps) {
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
        label="Tìm kiếm theo mã"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Nhập mã giảm giá..."
        sx={{ ...filterStyles, flexGrow: 1, minWidth: 220 }}
      />

      <FormControl size="small" sx={{ ...filterStyles, minWidth: 160 }}>
        <InputLabel>Trạng thái</InputLabel>
        <Select value={status} label="Trạng thái" onChange={(e) => onStatusChange(e.target.value)}>
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          <MenuItem value="active">Hoạt động</MenuItem>
          <MenuItem value="inactive">Không hoạt động</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ ...filterStyles, minWidth: 160 }}>
        <InputLabel>Loại</InputLabel>
        <Select value={type} label="Loại" onChange={(e) => onTypeChange(e.target.value)}>
          <MenuItem value="">Tất cả loại</MenuItem>
          <MenuItem value="percent">Phần trăm</MenuItem>
          <MenuItem value="fixed_amount">Số tiền cố định</MenuItem>
        </Select>
      </FormControl>
    </Box>
  )
}

