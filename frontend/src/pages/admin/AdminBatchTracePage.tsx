import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, CardContent, Chip, CircularProgress, MenuItem, TextField, Typography } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useNavigate, useParams } from 'react-router-dom'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar from '../../components/admin/ui/data-table-toolbar'
import {
  type BatchAllocationRow,
  type BatchTraceResponse,
  type BatchType,
  type StockLedgerRow,
  getBatchTrace,
  getBatchTypeLabel,
  getMovementTypeLabel,
} from '../../services/admin/inventoryTraceService'

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('vi-VN') : '-')
const movementColumns: Column<StockLedgerRow>[] = [
  { id: 'timestamp', label: 'Thời gian', render: (row) => formatDateTime(row.timestamp) },
  { id: 'movement_type', label: 'Giao dịch', render: (row) => getMovementTypeLabel(row.movement_type) },
  { id: 'quantity_before', label: 'Trước', numeric: true },
  { id: 'quantity', label: 'Thay đổi', numeric: true },
  { id: 'quantity_after', label: 'Sau', numeric: true },
  { id: 'order_id', label: 'Đơn hàng', numeric: true, render: (row) => row.order_id ?? '-' },
  { id: 'reason', label: 'Lý do', render: (row) => row.reason || '-' },
]
const allocationColumns: Column<BatchAllocationRow>[] = [
  { id: 'allocation_id', label: 'Mã phân bổ', numeric: true },
  { id: 'order_id', label: 'Mã đơn', numeric: true },
  { id: 'order_item_id', label: 'Mã dòng đơn', numeric: true },
  { id: 'quantity', label: 'Số lượng', numeric: true },
  { id: 'created_at', label: 'Thời gian', render: (row) => formatDateTime(row.created_at) },
]

export default function AdminBatchTracePage() {
  const params = useParams()
  const navigate = useNavigate()
  const routeType = params.batchType as BatchType | undefined
  const routeId = params.batchId ? Number(params.batchId) : undefined
  const [batchType, setBatchType] = useState<BatchType>(routeType || 'sanpham')
  const [batchId, setBatchId] = useState(routeId ? String(routeId) : '')
  const [trace, setTrace] = useState<BatchTraceResponse | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const loadTrace = useCallback(async (type: BatchType, id: number) => {
    setStatus('loading')
    setError(null)
    try { setTrace(await getBatchTrace(type, id)); setStatus('idle') }
    catch { setTrace(null); setError('Không thể tải dữ liệu truy vết lô'); setStatus('error') }
  }, [])

  useEffect(() => {
    if (routeType && routeId) { setBatchType(routeType); setBatchId(String(routeId)); void loadTrace(routeType, routeId) }
  }, [loadTrace, routeId, routeType])

  const handleSearch = () => {
    const id = Number(batchId)
    if (!id || id < 1) { setError('Mã lô phải là số dương'); return }
    navigate(`/admin/batch-trace/${batchType}/${id}`)
    void loadTrace(batchType, id)
  }

  return (
    <AdminPage title="Truy vết lô" breadcrumb={[{ label: 'Truy vết lô' }]}>
      <DataTableToolbar title="Tra cứu lịch sử của một lô hàng" actions={<Button startIcon={<SearchIcon />} variant="contained" onClick={handleSearch} disabled={status === 'loading'}>Tra cứu</Button>}>
        <TextField select size="small" label="Loại lô" value={batchType} onChange={(event) => setBatchType(event.target.value as BatchType)}>
          <MenuItem value="sanpham">Sản phẩm</MenuItem><MenuItem value="linhkien">Linh kiện</MenuItem><MenuItem value="hopqua">Hộp quà</MenuItem>
        </TextField>
        <TextField size="small" label="Mã lô" type="number" value={batchId} onChange={(event) => setBatchId(event.target.value)} />
      </DataTableToolbar>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {status === 'loading' && <CircularProgress aria-label="Đang tải" />}
      {status === 'idle' && trace && <>
        <Card sx={{ my: 3 }}><CardContent>
          <Typography variant="h6">{trace.batch.item_name}</Typography>
          <Chip label={getBatchTypeLabel(trace.batch.batch_type)} sx={{ mr: 1, mt: 1 }} />
          <Chip label={`Mã lô: ${trace.batch.batch_code}`} sx={{ mr: 1, mt: 1 }} />
          <Chip label={`Nhập: ${trace.batch.imported_quantity}`} color="info" sx={{ mr: 1, mt: 1 }} />
          <Chip label={`Hiện tại: ${trace.batch.current_quantity}`} color="success" sx={{ mr: 1, mt: 1 }} />
          <Chip label={`HSD: ${formatDateTime(trace.batch.expires_at)}`} sx={{ mt: 1 }} />
          {trace.batch.variant_name && <Typography variant="body2" sx={{ mt: 2 }}>Biến thể: {trace.batch.variant_name}</Typography>}
        </CardContent></Card>
        <Typography variant="h6" sx={{ mb: 1 }}>Lịch sử kho</Typography>
        <DataTable caption="Lịch sử biến động của lô" columns={movementColumns} rows={trace.movements} getRowId={(row) => row.ledger_id} getRowLabel={(row) => getMovementTypeLabel(row.movement_type)} total={trace.movements.length} page={0} pageSize={Math.max(25, trace.movements.length || 25)} onPageChange={() => undefined} onPageSizeChange={() => undefined} />
        <Typography variant="h6" sx={{ my: 2 }}>Phân bổ đơn hàng</Typography>
        <DataTable caption="Phân bổ đơn hàng của lô" columns={allocationColumns} rows={trace.allocations} getRowId={(row) => row.allocation_id} getRowLabel={(row) => `Đơn ${row.order_id}`} total={trace.allocations.length} page={0} pageSize={Math.max(25, trace.allocations.length || 25)} onPageChange={() => undefined} onPageSizeChange={() => undefined} />
      </>}
    </AdminPage>
  )
}
