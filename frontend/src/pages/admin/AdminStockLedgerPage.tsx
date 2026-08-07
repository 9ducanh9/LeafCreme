import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  BatchType,
  MovementType,
  StockLedgerRow,
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

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('vi-VN')
}

const getMovementColor = (movementType: MovementType) => {
  if (movementType === 'nhap_hang' || movementType === 'tra_hang') return 'success'
  if (movementType === 'xuat_ban' || movementType === 'xuat_bom' || movementType === 'xuat_huy') return 'error'
  if (movementType === 'kiem_ke') return 'warning'
  return 'default'
}

export default function AdminStockLedgerPage() {
  const [rows, setRows] = useState<StockLedgerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itemType, setItemType] = useState<BatchType | ''>('')
  const [movementType, setMovementType] = useState<MovementType | ''>('')
  const [batchId, setBatchId] = useState('')
  const [orderId, setOrderId] = useState('')

  const loadLedger = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getInventoryLedger({
        item_type: itemType || undefined,
        movement_type: movementType || undefined,
        batch_id: batchId ? Number(batchId) : undefined,
        order_id: orderId ? Number(orderId) : undefined,
        limit: 200,
      })
      setRows(data)
    } catch (err) {
      setError('Không thể tải lịch sử kho')
    } finally {
      setLoading(false)
    }
  }, [batchId, itemType, movementType, orderId])

  useEffect(() => {
    loadLedger()
  }, [loadLedger])

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          Lịch sử kho
        </Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={loadLedger} disabled={loading}>
          Làm mới
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="Loại lô"
          value={itemType}
          onChange={(event) => setItemType(event.target.value as BatchType | '')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {batchTypes.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              {type.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Giao dịch"
          value={movementType}
          onChange={(event) => setMovementType(event.target.value as MovementType | '')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Tất cả</MenuItem>
          {movementTypes.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              {type.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Batch ID"
          value={batchId}
          onChange={(event) => setBatchId(event.target.value)}
          type="number"
        />
        <TextField
          size="small"
          label="Order ID"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          type="number"
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="360px">
          <CircularProgress sx={{ color: '#C59B72' }} />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Thời gian</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Batch</TableCell>
                <TableCell>Giao dịch</TableCell>
                <TableCell align="right">Trước</TableCell>
                <TableCell align="right">Thay đổi</TableCell>
                <TableCell align="right">Sau</TableCell>
                <TableCell>Đơn hàng</TableCell>
                <TableCell>Lý do</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.item_type}-${row.ledger_id}`} hover>
                  <TableCell>{formatDateTime(row.timestamp)}</TableCell>
                  <TableCell>{getBatchTypeLabel(row.item_type)}</TableCell>
                  <TableCell>{row.batch_id}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={getMovementTypeLabel(row.movement_type)}
                      color={getMovementColor(row.movement_type)}
                    />
                  </TableCell>
                  <TableCell align="right">{row.quantity_before}</TableCell>
                  <TableCell align="right">{row.quantity}</TableCell>
                  <TableCell align="right">{row.quantity_after}</TableCell>
                  <TableCell>{row.order_id || '-'}</TableCell>
                  <TableCell>{row.reason || '-'}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Chưa có lịch sử kho phù hợp
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
