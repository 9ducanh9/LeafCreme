// Voucher Filters component - filter by status, type, search
import { useEffect, useState } from 'react'
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { useDebouncedCallback } from '../../../hooks/admin/useDebouncedCallback'
import { ADMIN_SEARCH_FIELD_ID } from '../ui/data-table-toolbar'

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
  const [localSearch, setLocalSearch] = useState(search)
  useEffect(() => { setLocalSearch(search) }, [search])
  const debouncedSearchChange = useDebouncedCallback(onSearchChange, 400)

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', bgcolor: 'background.paper', p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <TextField
        id={ADMIN_SEARCH_FIELD_ID}
        label="Tìm kiếm theo mã"
        variant="outlined"
        size="small"
        value={localSearch}
        onChange={(e) => { setLocalSearch(e.target.value); debouncedSearchChange(e.target.value) }}
        placeholder="Nhập mã giảm giá..."
        sx={{ flexGrow: 1, minWidth: 220 }}
      />

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Trạng thái</InputLabel>
        <Select value={status} label="Trạng thái" onChange={(e) => onStatusChange(e.target.value)}>
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          <MenuItem value="active">Hoạt động</MenuItem>
          <MenuItem value="inactive">Không hoạt động</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 160 }}>
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
