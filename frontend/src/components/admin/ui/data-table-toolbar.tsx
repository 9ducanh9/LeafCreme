import { useEffect, useState } from 'react'
import { Box, Button, TextField } from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'
import { useDebouncedCallback } from '../../../hooks/admin/useDebouncedCallback'

// Phím tắt "/" (spec 13 §8) focus vào ô tìm kiếm của trang đang mở. Vì chỉ
// một trang admin được mount tại một thời điểm, id cố định là đủ — không
// cần Context riêng cho việc này.
export const ADMIN_SEARCH_FIELD_ID = 'admin-search-field'

interface DataTableToolbarProps {
  title?: string
  search?: string
  onSearchChange?: (value: string) => void
  filters?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  onClear?: () => void
}

export default function DataTableToolbar({
  title,
  search = '',
  onSearchChange,
  filters,
  actions,
  children,
  onClear,
}: DataTableToolbarProps) {
  // Input hiển thị giá trị gõ ngay lập tức; onSearchChange (patch URL + fetch)
  // bị trì hoãn để không bắn 1 request mỗi ký tự.
  const [localSearch, setLocalSearch] = useState(search)
  useEffect(() => { setLocalSearch(search) }, [search])
  const debouncedSearchChange = useDebouncedCallback((value: string) => onSearchChange?.(value), 400)

  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
      {title && <Box component="strong" sx={{ mr: 'auto' }}>{title}</Box>}
      {onSearchChange && (
        <TextField
          id={ADMIN_SEARCH_FIELD_ID}
          size="small"
          label="Tìm kiếm"
          value={localSearch}
          onChange={(event) => { setLocalSearch(event.target.value); debouncedSearchChange(event.target.value) }}
        />
      )}
      {filters}
      {children}
      {onClear && <Button size="small" startIcon={<ClearIcon />} onClick={onClear}>Xoá bộ lọc</Button>}
      {actions}
    </Box>
  )
}
