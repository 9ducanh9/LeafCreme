import { IconButton, Chip, Box } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Voucher } from '../../../types/admin'
import DataTable, { type Column, type SortDirection } from '../ui/data-table'

interface VoucherTableProps {
  vouchers: Voucher[]
  onEdit: (voucher: Voucher) => void
  onDelete: (id: string) => void
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  sortBy?: string
  sortDir?: SortDirection
  onSortChange?: (sortBy: string, sortDir: SortDirection) => void
  status?: 'idle' | 'loading' | 'error'
  error?: string | null
  onRetry?: () => void
  selectedIds?: Set<string | number>
  onSelectionChange?: (ids: Set<string | number>) => void
  bulkActions?: React.ReactNode
}

const formatDate = (value: string) => new Date(value).toLocaleDateString('vi-VN')
const isExpired = (value: string) => new Date(value) < new Date()

export default function VoucherTable({
  vouchers, onEdit, onDelete, total, page, pageSize, onPageChange, onPageSizeChange,
  sortBy, sortDir, onSortChange, status = 'idle', error, onRetry, selectedIds, onSelectionChange, bulkActions,
}: VoucherTableProps) {
  const columns: Column<Voucher>[] = [
    { id: 'ma_phieu', label: 'Mã', sortable: true, render: (voucher) => <Box sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{voucher.code}</Box> },
    { id: 'type', label: 'Loại', render: (voucher) => <Chip label={voucher.type === 'percent' ? 'Phần trăm' : 'Số tiền'} size="small" color="warning" variant="outlined" /> },
    { id: 'discountValue', label: 'Giảm giá', numeric: true, render: (voucher) => voucher.type === 'percent' ? `${voucher.discountValue}%` : `${voucher.discountValue.toLocaleString('vi-VN')} ₫` },
    { id: 'appliesTo', label: 'Áp dụng', render: (voucher) => <Chip label={voucher.appliesTo === 'all' ? 'Tất cả' : voucher.appliesTo === 'category' ? 'Danh mục' : 'Sản phẩm'} size="small" /> },
    { id: 'minOrderValue', label: 'Đơn tối thiểu', numeric: true, render: (voucher) => voucher.minOrderValue ? voucher.minOrderValue.toLocaleString('vi-VN') : '-' },
    { id: 'usageLimit', label: 'Giới hạn', numeric: true, render: (voucher) => voucher.usageLimit || '∞' },
    { id: 'ngay_het_han', label: 'Hết hạn', sortable: true, render: (voucher) => <Box sx={{ color: isExpired(voucher.expiresAt) ? 'error.main' : 'text.secondary' }}>{formatDate(voucher.expiresAt)}</Box> },
    { id: 'status', label: 'Trạng thái', render: (voucher) => <Chip label={voucher.status === 'active' ? 'Hoạt động' : 'Tắt'} color={voucher.status === 'active' ? 'success' : 'default'} size="small" /> },
  ]
  return (
    <DataTable
      caption="Danh sách mã giảm giá"
      columns={columns}
      rows={vouchers}
      getRowId={(voucher) => voucher.id}
      getRowLabel={(voucher) => voucher.code}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      sortBy={sortBy}
      sortDir={sortDir}
      onSortChange={onSortChange}
      status={status}
      error={error}
      onRetry={onRetry}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      bulkActions={bulkActions}
      rowActions={(voucher) => <Box sx={{ display: 'flex', gap: 0.5 }}><IconButton size="small" color="primary" aria-label="Sửa voucher" onClick={() => onEdit(voucher)}><EditIcon fontSize="small" /></IconButton><IconButton size="small" color="error" aria-label="Xóa voucher" onClick={() => onDelete(voucher.id)}><DeleteIcon fontSize="small" /></IconButton></Box>}
    />
  )
}
