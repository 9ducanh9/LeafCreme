// Admin Product Management Page
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import AdminPage from '../../components/admin/ui/admin-page'
import ProductTable from '../../components/admin/products/ProductTable'
import ProductFilters from '../../components/admin/products/ProductFilters'
import ProductForm from '../../components/admin/products/ProductForm'
import {
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from '../../services/admin/productService'
import { ProductVariant } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import { downloadCsv } from '../../utils/admin/exportCsv'
import { useAdminCreateAction } from '../../contexts/AdminCreateActionContext'

export default function AdminProductPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const { can } = useAuth()
  const canWrite = can('products.write')
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const table = useDataTableState({ key: 'products', defaultSortBy: 'ten', defaultSortDir: 'asc', defaultPageSize: 50, filterKeys: ['category', 'size', 'search'] })
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })

  // Filters — vào URL qua table.filters (spec 10 §5): copy link cho đồng
  // nghiệp mở đúng bộ lọc đang xem, reload không mất filter.
  const { category = '', size = '', search = '' } = table.filters
  const [total, setTotal] = useState(0)
  const [tableStatus, setTableStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [tableError, setTableError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const filtersKey = JSON.stringify(table.filters)
  useEffect(() => { setSelected(new Set()) }, [table.sortBy, table.sortDir, filtersKey])

  const loadVariants = useCallback(async () => {
    try {
      setTableStatus('loading'); setTableError(null)
      const data = await getProductVariants({ category, size, search, skip: table.skip, limit: table.pageSize, sort_by: table.sortBy, sort_dir: table.sortDir })
      setVariants(data.items); setTotal(data.total); setTableStatus('idle')
    } catch (error: unknown) {
      console.error('Error loading variants:', error)
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể tải danh sách sản phẩm')
      setTableError(message || 'Không thể tải danh sách sản phẩm'); setTableStatus('error')
    }
  }, [category, search, showError, size, table.pageSize, table.skip, table.sortBy, table.sortDir])

  useEffect(() => {
    loadVariants()
  }, [loadVariants])

  const handleCreate = () => {
    setEditingVariant(null)
    setFormOpen(true)
  }
  useAdminCreateAction(canWrite ? handleCreate : null)

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
        table.patch({ filters: {} })
      }
      // Force reload variants to get latest data
      await loadVariants()
      setFormOpen(false)
      setEditingVariant(null)
    } catch (error: unknown) {
      console.error('Error saving product:', error)
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể lưu sản phẩm')
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id })
  }

  const handleRestock = (variant: ProductVariant) => {
    navigate(`/admin/batches?variant=${encodeURIComponent(variant.id)}`)
  }

  const exportSelected = () => {
    const rows = variants.filter((v) => selected.has(v.id))
    downloadCsv(
      `san-pham-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Tên', 'Danh mục', 'Giá', 'Kích thước', 'Trạng thái', 'SKU'],
      rows.map((v) => [v.name, v.category, v.price, v.sizeLabel || v.size, v.status === 'active' ? 'Hoạt động' : 'Ẩn', v.sku || '']),
    )
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
    <AdminPage
      title="Sản phẩm"
      breadcrumb={[{ label: 'Sản phẩm' }]}
      actions={canWrite && <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>Thêm sản phẩm</Button>}
    >
      <ProductFilters
        category={category}
        size={size}
        search={search}
        onCategoryChange={(value) => table.patch({ filters: { ...table.filters, category: value } })}
        onSizeChange={(value) => table.patch({ filters: { ...table.filters, size: value } })}
        onSearchChange={(value) => table.patch({ filters: { ...table.filters, search: value } })}
      />

      <ProductTable
        variants={variants} onEdit={handleEdit} onDelete={handleDelete} onRestock={handleRestock} total={total} page={table.page} pageSize={table.pageSize}
        onPageChange={(page) => table.patch({ page })} onPageSizeChange={(pageSize) => table.patch({ pageSize })}
        sortBy={table.sortBy} sortDir={table.sortDir} onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })}
        status={tableStatus} error={tableError} onRetry={() => void loadVariants()}
        selectedIds={selected} onSelectionChange={setSelected}
        bulkActions={<Button size="small" startIcon={<FileDownloadIcon />} onClick={exportSelected}>Xuất CSV</Button>}
      />

      <ProductForm
        open={formOpen}
        variant={editingVariant}
        sizeOptions={Array.from(new Set(variants.map((item) => item.size).filter(Boolean)))}
        onClose={() => {
          setFormOpen(false)
          setEditingVariant(null)
        }}
        onSubmit={handleSubmit}
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
    </AdminPage>
  )
}
