// Admin Product Management Page
import { useState, useEffect } from 'react'
import { Box, Button, Typography, Paper } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CategoryIcon from '@mui/icons-material/Category'
import ProductTable from '../../components/admin/products/ProductTable'
import ProductFilters from '../../components/admin/products/ProductFilters'
import ProductForm from '../../components/admin/products/ProductForm'
import CategoryManager from '../../components/admin/products/CategoryManager'
import {
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from '../../services/admin/productService'
import { ProductVariant } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function AdminProductPage() {
  const { showSuccess, showError } = useToast()
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })

  // Filters
  const [category, setCategory] = useState('')
  const [size, setSize] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadVariants()
  }, [category, size, search])

  const loadVariants = async () => {
    setLoading(true)
    try {
      const data = await getProductVariants({ category, size, search })
      setVariants(data)
    } catch (error) {
      showError('Không thể tải danh sách sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingVariant(null)
    setFormOpen(true)
  }

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant)
    setFormOpen(true)
  }

  const handleSubmit = async (data: Omit<ProductVariant, 'id'>) => {
    try {
      if (editingVariant) {
        await updateProductVariant(editingVariant.id, data)
        showSuccess('Cập nhật sản phẩm thành công')
      } else {
        await createProductVariant(data)
        showSuccess('Tạo sản phẩm thành công')
        // Reset filters to show the new product
        setCategory('')
        setSize('')
        setSearch('')
      }
      await loadVariants()
      setFormOpen(false)
      setEditingVariant(null)
    } catch (error) {
      showError('Không thể lưu sản phẩm')
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    try {
      await deleteProductVariant(deleteConfirm.id)
      showSuccess('Xóa sản phẩm thành công')
      await loadVariants()
    } catch (error) {
      showError('Không thể xóa sản phẩm')
    } finally {
      setDeleteConfirm({ open: false, id: null })
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          Quản lý sản phẩm
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            onClick={() => setCategoryManagerOpen(true)}
            sx={{ borderColor: '#C59B72', color: '#C59B72', '&:hover': { borderColor: '#B0895F', bgcolor: '#FAFAF7' } }}
          >
            Quản lý danh mục
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ bgcolor: '#C59B72', '&:hover': { bgcolor: '#B0895F' } }}
          >
            Thêm sản phẩm
          </Button>
        </Box>
      </Box>

      <ProductFilters
        category={category}
        size={size}
        search={search}
        onCategoryChange={setCategory}
        onSizeChange={setSize}
        onSearchChange={setSearch}
      />

      <ProductTable variants={variants} onEdit={handleEdit} onDelete={handleDelete} />

      <ProductForm
        open={formOpen}
        variant={editingVariant}
        onClose={() => {
          setFormOpen(false)
          setEditingVariant(null)
        }}
        onSubmit={handleSubmit}
      />

      <CategoryManager
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        onCategoriesChange={() => {
          // Reload variants to refresh category filter
          loadVariants()
        }}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        message="Bạn có chắc chắn muốn xóa sản phẩm này?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        variant="danger"
      />
    </Box>
  )
}

