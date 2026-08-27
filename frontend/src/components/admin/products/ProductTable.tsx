// Product Table component - displays product variants in a table
import { IconButton, Chip, Avatar, Box, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddBusinessIcon from '@mui/icons-material/AddBusiness'
import { ProductVariant } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'
import { getImageUrl } from '../../../utils/getImageUrl'
import { useAuth } from '../../../contexts/AuthContext'
import DataTable, { type Column, type SortDirection } from '../ui/data-table'

interface ProductTableProps {
  variants: ProductVariant[]
  onEdit: (variant: ProductVariant) => void
  onDelete: (id: string) => void
  onRestock: (variant: ProductVariant) => void
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  sortBy: string
  sortDir: SortDirection
  onSortChange: (sortBy: string, sortDir: SortDirection) => void
  status?: 'idle' | 'loading' | 'error'
  error?: string | null
  onRetry?: () => void
  selectedIds?: Set<string | number>
  onSelectionChange?: (ids: Set<string | number>) => void
  bulkActions?: React.ReactNode
}

export default function ProductTable({ variants, onEdit, onDelete, onRestock, total, page, pageSize, onPageChange, onPageSizeChange, sortBy, sortDir, onSortChange, status = 'idle', error, onRetry, selectedIds, onSelectionChange, bulkActions }: ProductTableProps) {
  const { can } = useAuth()
  const canWrite = can('products.write')
  const canRestock = can('batches.write')
  const getStatusColor = (status: ProductVariant['status']) => {
    return status === 'active' ? 'success' : 'default'
  }

  const columns: Column<ProductVariant>[] = [
    { id: 'image', label: 'Hình ảnh', render: (variant) => <Avatar src={variant.image ? getImageUrl(variant.image) : undefined} alt={variant.name} variant="rounded" sx={{ width: 48, height: 48 }}>{variant.name.charAt(0).toUpperCase()}</Avatar> },
    { id: 'name', label: 'Tên', sortable: true, render: (variant) => <Box sx={{ fontWeight: 600 }}>{variant.name}</Box> },
    { id: 'description', label: 'Mô tả', render: (variant) => <Box sx={{ color: 'text.secondary', maxWidth: 300 }}>{variant.description}</Box> },
    { id: 'category', label: 'Danh mục', sortable: true, render: (variant) => <Chip label={variant.category || '-'} size="small" color="warning" variant="outlined" /> },
    { id: 'price', label: 'Giá', numeric: true, sortable: true, render: (variant) => <Box sx={{ fontWeight: 700 }}>{formatPrice(variant.price)}</Box> },
    { id: 'size', label: 'Kích thước', render: (variant) => <Chip label={variant.sizeLabel || variant.size || 'N/A'} size="small" sx={{ bgcolor: 'grey.100', color: 'text.secondary' }} /> },
    { id: 'shelfLifeDays', label: 'HSD', render: (variant) => variant.shelfLifeDays ? `${variant.shelfLifeDays} ngày` : 'Chưa đặt' },
    { id: 'status', label: 'Trạng thái', render: (variant) => <Chip label={variant.status === 'active' ? 'Hoạt động' : 'Ẩn'} color={getStatusColor(variant.status)} size="small" /> },
    { id: 'sku', label: 'SKU', render: (variant) => <Box sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{variant.sku || '-'}</Box> },
  ]
  return <DataTable
    caption="Danh sách sản phẩm"
    columns={columns}
    rows={variants}
    status={status}
    error={error}
    onRetry={onRetry}
    getRowId={(variant) => variant.id}
    getRowLabel={(variant) => `${variant.name} · ${variant.sizeLabel || variant.size || 'Sản phẩm'}`}
    total={total}
    page={page}
    pageSize={pageSize}
    onPageChange={onPageChange}
    onPageSizeChange={onPageSizeChange}
    sortBy={sortBy}
    sortDir={sortDir}
    onSortChange={onSortChange}
    selectedIds={selectedIds}
    onSelectionChange={onSelectionChange}
    bulkActions={bulkActions}
    rowActions={canWrite || canRestock ? (variant) => <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
      {canRestock && variant.id.startsWith('variant:') && <Tooltip title="Nhập thêm hàng"><IconButton size="small" color="success" aria-label={`Nhập thêm hàng cho ${variant.name} ${variant.sizeLabel || variant.size}`} onClick={() => onRestock(variant)}><AddBusinessIcon fontSize="small" /></IconButton></Tooltip>}
      {canWrite && <IconButton size="small" color="primary" aria-label="Sửa sản phẩm" onClick={() => onEdit(variant)}><EditIcon fontSize="small" /></IconButton>}
      {canWrite && <IconButton size="small" color="error" aria-label="Xóa sản phẩm" onClick={() => onDelete(variant.id)}><DeleteIcon fontSize="small" /></IconButton>}
    </Box> : undefined}
  />
}
