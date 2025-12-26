// Product Filters component - filter by category, size, search
import { useState, useEffect } from 'react'
import { Box, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material'
import { ProductVariant } from '../../../types/admin'
import { getCategories } from '../../../services/admin/categoryService'
import { getProducts } from '../../../services/productService'

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

  const loadCategories = async () => {
    try {
      // Load categories from localStorage first (for backward compatibility)
      const localCats = getCategories()
      
      // Also fetch categories from API to get real-time updates
      try {
        const products = await getProducts({ limit: 1000 })
        const apiCategories = Array.from(
          new Set(products.map(p => p.danh_muc).filter(Boolean))
        ).sort() as string[]
        
        // Merge both sources, prioritizing API data
        const allCategories = Array.from(new Set([...apiCategories, ...localCats])).sort()
        setCategories(allCategories)
      } catch (error) {
        // Fallback to localStorage if API fails
        console.warn('Failed to load categories from API, using localStorage:', error)
        setCategories(localCats)
      }
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
        label="Tìm kiếm sản phẩm"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Nhập tên sản phẩm..."
        sx={{ ...filterStyles, flexGrow: 1, minWidth: 220 }}
      />

      <FormControl size="small" sx={{ ...filterStyles, minWidth: 160 }}>
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

      <FormControl size="small" sx={{ ...filterStyles, minWidth: 140 }}>
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

