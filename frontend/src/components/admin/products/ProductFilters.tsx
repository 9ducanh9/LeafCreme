// Product Filters component - filter by category, size, search
import { useState, useEffect } from 'react'
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { ProductVariant } from '../../../types/admin'
import { getCategories } from '../../../services/admin/categoryService'

interface ProductFiltersProps {
  category: string
  size: string
  search: string
  onCategoryChange: (category: string) => void
  onSizeChange: (size: string) => void
  onSearchChange: (search: string) => void
}

const SIZES: ProductVariant['size'][] = ['S', 'M', 'L', 'XL']

export default function ProductFilters({
  category,
  size,
  search,
  onCategoryChange,
  onSizeChange,
  onSearchChange,
}: ProductFiltersProps) {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = () => {
    const cats = getCategories()
    setCategories(cats)
  }

  // Reload categories when component mounts or when window gets focus (user might have added categories in another tab)
  useEffect(() => {
    const handleFocus = () => {
      loadCategories()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

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
        label="Tìm kiếm sản phẩm"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ flexGrow: 1, minWidth: 200 }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
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

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Kích thước</InputLabel>
        <Select value={size} label="Kích thước" onChange={(e) => onSizeChange(e.target.value)}>
          <MenuItem value="">Tất cả kích thước</MenuItem>
          {SIZES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

