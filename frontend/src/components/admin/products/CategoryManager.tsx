// Category Manager component - Add/Delete categories
import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Typography,
  Chip,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { getCategories, addCategory, deleteCategory, isCategoryInUse } from '../../../services/admin/categoryService'
import { useToast } from '../../../contexts/ToastContext'

interface CategoryManagerProps {
  open: boolean
  onClose: () => void
  onCategoriesChange?: () => void
}

export default function CategoryManager({ open, onClose, onCategoriesChange }: CategoryManagerProps) {
  const { showSuccess, showError } = useToast()
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      loadCategories()
    }
  }, [open])

  const loadCategories = () => {
    const cats = getCategories()
    setCategories(cats)
  }

  const handleAddCategory = () => {
    setError('')
    if (!newCategory.trim()) {
      setError('Vui lòng nhập tên danh mục')
      return
    }

    try {
      addCategory(newCategory.trim())
      loadCategories()
      setNewCategory('')
      showSuccess('Thêm danh mục thành công')
      onCategoriesChange?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      setError(message || 'Không thể thêm danh mục')
      showError(message || 'Không thể thêm danh mục')
    }
  }

  const handleDeleteCategory = (category: string) => {
    if (isCategoryInUse(category)) {
      showError('Không thể xóa danh mục đang được sử dụng bởi sản phẩm')
      return
    }

    try {
      deleteCategory(category)
      loadCategories()
      showSuccess('Xóa danh mục thành công')
      onCategoriesChange?.()
    } catch (err: unknown) {
      void err
      showError('Không thể xóa danh mục')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
        Quản lý danh mục
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {/* Add Category */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1, color: '#7A6F63', fontWeight: 500 }}>
              Thêm danh mục mới
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value)
                  setError('')
                }}
                placeholder="Nhập tên danh mục..."
                error={!!error}
                helperText={error}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory()
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddCategory}
                sx={{ bgcolor: '#C59B72', '&:hover': { bgcolor: '#B0895F' } }}
              >
                <AddIcon />
              </Button>
            </Box>
          </Box>

          {/* Categories List */}
          <Box>
            <Typography variant="body2" sx={{ mb: 2, color: '#7A6F63', fontWeight: 500 }}>
              Danh sách danh mục ({categories.length})
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: '#FAFAF7',
                border: '1px solid #EFEDE6',
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              {categories.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#7A6F63', textAlign: 'center', py: 2 }}>
                  Chưa có danh mục nào
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {categories.map((cat) => {
                    const inUse = isCategoryInUse(cat)
                    return (
                      <Chip
                        key={cat}
                        label={cat}
                        onDelete={inUse ? undefined : () => handleDeleteCategory(cat)}
                        deleteIcon={<DeleteIcon />}
                        sx={{
                          bgcolor: inUse ? '#E8E5DD' : '#F5C96A',
                          color: '#473C2F',
                          fontWeight: 500,
                          '& .MuiChip-deleteIcon': {
                            color: inUse ? '#7A6F63' : '#d32f2f',
                          },
                        }}
                      />
                    )
                  })}
                </Box>
              )}
            </Paper>
            {categories.some((cat) => isCategoryInUse(cat)) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Danh mục có màu xám đang được sử dụng và không thể xóa
              </Alert>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  )
}



