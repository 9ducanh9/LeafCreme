import { Box, Button, TextField } from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'

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
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
      {title && <Box component="strong" sx={{ mr: 'auto' }}>{title}</Box>}
      {onSearchChange && <TextField size="small" label="Tìm kiếm" value={search} onChange={(event) => onSearchChange(event.target.value)} />}
      {filters}
      {children}
      {onClear && <Button size="small" startIcon={<ClearIcon />} onClick={onClear}>Xoá bộ lọc</Button>}
      {actions}
    </Box>
  )
}
