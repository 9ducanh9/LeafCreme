// Product Filters component - filter by category, size, search
import { useState, useEffect } from 'react'
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { getCategories } from '../../../services/admin/categoryService'
import { useDebouncedCallback } from '../../../hooks/admin/useDebouncedCallback'
import { ADMIN_SEARCH_FIELD_ID } from '../ui/data-table-toolbar'

interface ProductFiltersProps {
  category: string
  size: string
  search: string
  onCategoryChange: (category: string) => void
  onSizeChange: (size: string) => void
  onSearchChange: (search: string) => void
}

export default function ProductFilters({
  category,
  size,
  search,
  onCategoryChange,
  onSizeChange,
  onSearchChange,
}: ProductFiltersProps) {
  const [categories, setCategories] = useState<string[]>([])
  const [localSearch, setLocalSearch] = useState(search)
  useEffect(() => { setLocalSearch(search) }, [search])
  const debouncedSearchChange = useDebouncedCallback(onSearchChange, 400)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setCategories(await getCategories())
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    }
  }

  // Reload categories when component mounts, window gets focus, or periodically
  useEffect(() => {
    const handleFocus = () => {
      loadCategories()
    }
    window.addEventListener('focus', handleFocus)
    
    // Also reload categories periodically (every 30 seconds) to catch real-time updates
    const interval = setInterval(() => {
      loadCategories()
    }, 30000)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [])

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', bgcolor: 'background.paper', p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <TextField
        id={ADMIN_SEARCH_FIELD_ID}
        label="Tìm kiếm sản phẩm"
        variant="outlined"
        size="small"
        value={localSearch}
        onChange={(e) => { setLocalSearch(e.target.value); debouncedSearchChange(e.target.value) }}
        placeholder="Nhập tên sản phẩm..."
        sx={{ flexGrow: 1, minWidth: 220 }}
      />

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Danh mục</InputLabel>
        <Select
          value={category}
          label="Danh mục"
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <MenuItem value="">Tất cả danh mục</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Kích thước"
        variant="outlined"
        size="small"
        value={size}
        onChange={(e) => onSizeChange(e.target.value)}
        placeholder="Ví dụ: 16cm"
        sx={{ minWidth: 140 }}
      />
    </Box>
  )
}

