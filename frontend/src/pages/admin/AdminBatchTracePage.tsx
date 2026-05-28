import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import SearchIcon from '@mui/icons-material/Search'
import {
  BatchTraceResponse,
  BatchType,
  getBatchTrace,
  getBatchTypeLabel,
  getMovementTypeLabel,
} from '../../services/admin/inventoryTraceService'

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('vi-VN')
}

export default function AdminBatchTracePage() {
  const params = useParams()
  const navigate = useNavigate()
  const routeBatchType = params.batchType as BatchType | undefined
  const routeBatchId = params.batchId ? Number(params.batchId) : undefined

  const [batchType, setBatchType] = useState<BatchType>(routeBatchType || 'sanpham')
  const [batchId, setBatchId] = useState(routeBatchId ? String(routeBatchId) : '')
  const [trace, setTrace] = useState<BatchTraceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTrace = useCallback(async (type: BatchType, id: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBatchTrace(type, id)
      setTrace(data)
    } catch (err) {
      setTrace(null)
      setError('Không thể tải batch trace. Kiểm tra loại lô và Batch ID.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (routeBatchType && routeBatchId) {
      setBatchType(routeBatchType)
      setBatchId(String(routeBatchId))
      loadTrace(routeBatchType, routeBatchId)
    }
  }, [loadTrace, routeBatchId, routeBatchType])

  const handleSearch = () => {
    const id = Number(batchId)
    if (!id || id < 1) {
      setError('Batch ID phải là số dương')
      return
    }
    navigate(`/admin/batch-trace/${batchType}/${id}`)
    loadTrace(batchType, id)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          Batch Trace
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select
          size="small"
          label="Loại lô"
          value={batchType}
          onChange={(event) => setBatchType(event.target.value as BatchType)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="sanpham">Sản phẩm</MenuItem>
          <MenuItem value="linhkien">Linh kiện</MenuItem>
          <MenuItem value="hopqua">Hộp quà</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Batch ID"
          type="number"
          value={batchId}
          onChange={(event) => setBatchId(event.target.value)}
        />
        <Button startIcon={<SearchIcon />} variant="contained" onClick={handleSearch} disabled={loading}>
          Tra cứu
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="360px">
          <CircularProgress sx={{ color: '#C59B72' }} />
        </Box>
      )}

      {!loading && trace && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: '#473C2F' }}>
                {trace.batch.item_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={getBatchTypeLabel(trace.batch.batch_type)} />
                <Chip label={`Mã lô: ${trace.batch.batch_code}`} />
                <Chip label={`Batch ID: ${trace.batch.batch_id}`} />
                <Chip label={`Nhập: ${trace.batch.imported_quantity}`} color="info" />
                <Chip label={`Hiện tại: ${trace.batch.current_quantity}`} color="success" />
                <Chip label={`Đã bán/dùng: ${trace.batch.sold_or_used_quantity}`} color="warning" />
                <Chip label={`HSD: ${formatDateTime(trace.batch.expires_at)}`} />
              </Box>
              {trace.batch.variant_name && (
                <Typography variant="body2" sx={{ mt: 2, color: '#7A6F63' }}>
                  Biến thể: {trace.batch.variant_name}
                </Typography>
              )}
            </CardContent>
          </Card>

          <Typography variant="h6" sx={{ mb: 1, color: '#473C2F' }}>
            Lịch sử kho
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Giao dịch</TableCell>
                  <TableCell align="right">Trước</TableCell>
                  <TableCell align="right">Thay đổi</TableCell>
                  <TableCell align="right">Sau</TableCell>
                  <TableCell>Đơn hàng</TableCell>
                  <TableCell>Lý do</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trace.movements.map((row) => (
                  <TableRow key={`${row.item_type}-${row.ledger_id}`} hover>
                    <TableCell>{formatDateTime(row.timestamp)}</TableCell>
                    <TableCell>{getMovementTypeLabel(row.movement_type)}</TableCell>
                    <TableCell align="right">{row.quantity_before}</TableCell>
                    <TableCell align="right">{row.quantity}</TableCell>
                    <TableCell align="right">{row.quantity_after}</TableCell>
                    <TableCell>{row.order_id || '-'}</TableCell>
                    <TableCell>{row.reason || '-'}</TableCell>
                  </TableRow>
                ))}
                {trace.movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Chưa có lịch sử kho cho lô này
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" sx={{ mb: 1, color: '#473C2F' }}>
            Phân bổ đơn hàng
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Allocation ID</TableCell>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Order Item ID</TableCell>
                  <TableCell align="right">Số lượng</TableCell>
                  <TableCell>Thời gian</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trace.allocations.map((allocation) => (
                  <TableRow key={allocation.allocation_id} hover>
                    <TableCell>{allocation.allocation_id}</TableCell>
                    <TableCell>{allocation.order_id}</TableCell>
                    <TableCell>{allocation.order_item_id}</TableCell>
                    <TableCell align="right">{allocation.quantity}</TableCell>
                    <TableCell>{formatDateTime(allocation.created_at)}</TableCell>
                  </TableRow>
                ))}
                {trace.allocations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Chưa có đơn hàng nào dùng lô này
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  )
}
