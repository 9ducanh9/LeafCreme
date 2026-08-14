import { useCallback, useEffect, useState } from 'react'
import { Chip, MenuItem, TextField } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar from '../../components/admin/ui/data-table-toolbar'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import {
  type BatchType,
  type MovementType,
  type StockLedgerRow,
  getBatchTypeLabel,
  getInventoryLedger,
  getMovementTypeLabel,
} from '../../services/admin/inventoryTraceService'

const batchTypes: Array<{ value: BatchType; label: string }> = [
  { value: 'sanpham', label: 'Sản phẩm' },
  { value: 'linhkien', label: 'Linh kiện' },
  { value: 'hopqua', label: 'Hộp quà' },
]

const movementTypes: Array<{ value: MovementType; label: string }> = [
  { value: 'nhap_hang', label: 'Nhập hàng' },
  { value: 'xuat_ban', label: 'Xuất bán' },
  { value: 'xuat_bom', label: 'Xuất BOM' },
  { value: 'xuat_huy', label: 'Xuất hủy' },
  { value: 'dieu_chinh', label: 'Điều chỉnh' },
  { value: 'kiem_ke', label: 'Kiểm kê' },
  { value: 'tra_hang', label: 'Trả hàng' },
]

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('vi-VN') : '-')
const movementColor = (value: MovementType) => {
  if (value === 'nhap_hang' || value === 'tra_hang') return 'success'
  if (value === 'xuat_ban' || value === 'xuat_bom' || value === 'xuat_huy') return 'error'
  if (value === 'kiem_ke') return 'warning'
  return 'default'
}

const columns: Column<StockLedgerRow>[] = [
  { id: 'timestamp', label: 'Thời gian', sortable: true, render: (row) => formatDateTime(row.timestamp) },
  { id: 'item_type', label: 'Loại lô', render: (row) => getBatchTypeLabel(row.item_type) },
  { id: 'batch_id', label: 'Lô', numeric: true, sortable: true },
  {
    id: 'movement_type',
    label: 'Giao dịch',
    sortable: true,
    render: (row) => <Chip size="small" color={movementColor(row.movement_type)} label={getMovementTypeLabel(row.movement_type)} />,
  },
  { id: 'quantity_before', label: 'Trước', numeric: true },
  { id: 'quantity', label: 'Thay đổi', numeric: true },
  { id: 'quantity_after', label: 'Sau', numeric: true },
  { id: 'order_id', label: 'Đơn hàng', numeric: true, render: (row) => row.order_id ?? '-' },
  { id: 'reason', label: 'Lý do', render: (row) => row.reason || '-' },
]

export default function AdminStockLedgerPage() {
  const table = useDataTableState({
    key: 'ledger',
    defaultSortBy: 'timestamp',
    defaultSortDir: 'desc',
    defaultPageSize: 50,
    filterKeys: ['item_type', 'movement_type', 'batch_id', 'order_id'],
  })
  const [rows, setRows] = useState<StockLedgerRow[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const loadLedger = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const page = await getInventoryLedger({
        item_type: (table.filters.item_type || undefined) as BatchType | undefined,
        movement_type: (table.filters.movement_type || undefined) as MovementType | undefined,
        batch_id: table.filters.batch_id ? Number(table.filters.batch_id) : undefined,
        order_id: table.filters.order_id ? Number(table.filters.order_id) : undefined,
        skip: table.skip,
        limit: table.pageSize,
        sort_by: table.sortBy as 'timestamp' | 'movement_type',
        sort_dir: table.sortDir,
      })
      setRows(page.items)
      setTotal(page.total)
      setStatus('idle')
    } catch {
      setError('Không thể tải lịch sử kho')
      setStatus('error')
    }
  }, [table.filters, table.pageSize, table.skip, table.sortBy, table.sortDir])

  useEffect(() => { void loadLedger() }, [loadLedger])

  const updateFilter = (name: string, value: string) => table.patch({ filters: { ...table.filters, [name]: value } })
  const hasFilters = Object.keys(table.filters).length > 0

  return (
    <AdminPage title="Nhật ký kho" breadcrumb={[{ label: 'Nhật ký kho' }]}>
      <DataTableToolbar
        title="Theo dõi biến động tồn kho"
        actions={<button type="button" onClick={() => void loadLedger()} disabled={status === 'loading'}><RefreshIcon fontSize="small" /> Làm mới</button>}
      >
        <TextField select size="small" label="Loại lô" value={table.filters.item_type || ''} onChange={(event) => updateFilter('item_type', event.target.value)}>
          <MenuItem value="">Tất cả</MenuItem>
          {batchTypes.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Giao dịch" value={table.filters.movement_type || ''} onChange={(event) => updateFilter('movement_type', event.target.value)}>
          <MenuItem value="">Tất cả</MenuItem>
          {movementTypes.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
        </TextField>
        <TextField size="small" type="number" label="Mã lô" value={table.filters.batch_id || ''} onChange={(event) => updateFilter('batch_id', event.target.value)} />
        <TextField size="small" type="number" label="Mã đơn" value={table.filters.order_id || ''} onChange={(event) => updateFilter('order_id', event.target.value)} />
      </DataTableToolbar>
      <DataTable
        caption="Nhật ký biến động kho"
        columns={columns}
        rows={rows}
        getRowId={(row) => `${row.item_type}-${row.ledger_id}`}
        getRowLabel={(row) => `${getBatchTypeLabel(row.item_type)} #${row.batch_id}`}
        total={total}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={(page) => table.patch({ page })}
        onPageSizeChange={(pageSize) => table.patch({ pageSize })}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })}
        status={status}
        error={error}
        onRetry={() => void loadLedger()}
        hasActiveFilters={hasFilters}
        onClearFilters={() => table.patch({ filters: {} })}
      />
    </AdminPage>
  )
}
