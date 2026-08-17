// Order Detail Card — hiển thị + đổi trạng thái cho 1 đơn hàng (mọi loại).
import { useState } from 'react'
import {
  Box, Paper, Typography, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Select, MenuItem, FormControl, InputLabel, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert,
} from '@mui/material'
import type { Order, OrderStatus } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'
import {
  ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, ORDER_STATUS_OPTIONS, ORDER_TERMINAL_STATUSES, ORDER_TYPE_LABEL,
} from '../../../config/orderLabels'

interface OrderDetailCardProps {
  order: Order
  onStatusChange: (status: OrderStatus) => Promise<void>
  onCancel: (reason: string) => Promise<void>
}

function formatDate(dateString?: string) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrderDetailCard({ order, onStatusChange, onCancel }: OrderDetailCardProps) {
  const isTerminal = ORDER_TERMINAL_STATUSES.includes(order.status)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) return
    setCancelling(true)
    try {
      await onCancel(cancelReason.trim())
      setCancelOpen(false)
      setCancelReason('')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 4, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 1 }}>Đơn hàng {order.orderCode}</Typography>
          <Typography variant="body2" color="text.secondary">Tạo lúc: {formatDate(order.date)}</Typography>
        </Box>
        <Chip label={ORDER_STATUS_LABEL[order.status]} color={ORDER_STATUS_COLOR[order.status]} sx={{ fontWeight: 600 }} />
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Thông tin khách hàng</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Tên khách hàng</Typography>
            <Typography variant="body1" fontWeight={500}>{order.customerName}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Số điện thoại</Typography>
            <Typography variant="body1" fontWeight={500}>{order.phone || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Loại đơn</Typography>
            <Chip size="small" label={ORDER_TYPE_LABEL[order.orderType]} />
          </Box>
          {order.address && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Địa chỉ giao hàng</Typography>
              <Typography variant="body1" fontWeight={500}>{order.address}</Typography>
            </Box>
          )}
          {order.expectedDate && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Ngày giao / lấy dự kiến</Typography>
              <Typography variant="body1" fontWeight={500}>{formatDate(order.expectedDate)}</Typography>
            </Box>
          )}
          {order.orderType === 'dat_truoc' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Tiền đặt cọc</Typography>
              <Typography variant="body1" fontWeight={500}>{formatPrice(order.deposit)}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 220 }} disabled={isTerminal}>
          <InputLabel>Đổi trạng thái</InputLabel>
          <Select
            value={order.status}
            label="Đổi trạng thái"
            onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
          >
            {ORDER_STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</MenuItem>
            ))}
            {/* Trạng thái hiện tại có thể không nằm trong ORDER_STATUS_OPTIONS (vd: đơn đã hủy) — vẫn hiện để Select không lỗi giá trị lạ. */}
            {!ORDER_STATUS_OPTIONS.includes(order.status) && (
              <MenuItem value={order.status}>{ORDER_STATUS_LABEL[order.status]}</MenuItem>
            )}
          </Select>
        </FormControl>
        {!isTerminal && (
          <Button color="error" variant="outlined" onClick={() => setCancelOpen(true)}>
            Hủy đơn hàng
          </Button>
        )}
        {isTerminal && (
          <Typography variant="caption" color="text.secondary">
            Đơn ở trạng thái cuối — không thể đổi trạng thái qua đây.
          </Typography>
        )}
      </Box>

      {order.notes && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Ghi chú</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>{order.notes}</Typography>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Sản phẩm trong đơn</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sản phẩm</TableCell>
                <TableCell align="right">Số lượng</TableCell>
                <TableCell align="right">Đơn giá</TableCell>
                <TableCell align="right">Thành tiền</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Không có dữ liệu sản phẩm</TableCell></TableRow>
              ) : order.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{formatPrice(item.price)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatPrice(item.price * item.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Box sx={{ textAlign: 'right', minWidth: 240 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Tạm tính</Typography>
            <Typography variant="body2">{formatPrice(order.subtotal)}</Typography>
          </Box>
          {order.discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Giảm giá</Typography>
              <Typography variant="body2" color="error.main">−{formatPrice(order.discount)}</Typography>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Tổng</Typography>
            <Typography variant="h6">{formatPrice(order.totalAmount)}</Typography>
          </Box>
        </Box>
      </Box>

      <Dialog open={cancelOpen} onClose={() => !cancelling && setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Hủy đơn hàng {order.orderCode}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>Hủy đơn sẽ hoàn lại tồn kho và lượt dùng voucher đã trừ khi tạo đơn.</Alert>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={2}
            label="Lý do hủy"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelling}>Đóng</Button>
          <Button color="error" variant="contained" onClick={handleCancelConfirm} disabled={cancelling || !cancelReason.trim()}>
            Xác nhận hủy
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
