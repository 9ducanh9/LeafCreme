// Order Detail Card — hiển thị + đổi trạng thái cho 1 đơn hàng (mọi loại).
import { useState } from 'react'
import {
  Box, Paper, Typography, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Select, MenuItem, FormControl, InputLabel, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Stack,
} from '@mui/material'
import PaymentsIcon from '@mui/icons-material/Payments'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import type { Order, OrderStatus } from '../../../types/admin'
import type { PaymentStatus } from '../../../services/paymentService'
import { formatPrice } from '../../../utils/formatPrice'
import {
  getOrderStatusOptions, ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, ORDER_TERMINAL_STATUSES, ORDER_TYPE_LABEL,
} from '../../../config/orderLabels'

interface OrderDetailCardProps {
  order: Order
  payments: PaymentStatus[]
  onStatusChange: (status: OrderStatus) => Promise<void>
  onCancel: (reason: string) => Promise<void>
  onRecordCash: (amount: number) => Promise<boolean>
  onCreateSePay: () => Promise<void>
}

function formatDate(dateString?: string) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrderDetailCard({ order, payments, onStatusChange, onCancel, onRecordCash, onCreateSePay }: OrderDetailCardProps) {
  const isTerminal = ORDER_TERMINAL_STATUSES.includes(order.status)
  const paidAmount = payments.reduce((sum, payment) => sum + (payment.trang_thai === 'thanh_cong' ? Number(payment.so_tien) : 0), 0)
  const remainingAmount = Math.max(0, order.totalAmount - paidAmount)
  const pendingSePay = payments.some((payment) => payment.phuong_thuc === 'chuyen_khoan' && payment.trang_thai === 'dang_xu_ly')
  const hasSePayPayment = payments.some((payment) => payment.phuong_thuc === 'chuyen_khoan')
  const isPaid = remainingAmount <= 0
  const statusOptions = getOrderStatusOptions(order.status, Boolean(order.address), isPaid, hasSePayPayment)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cashConfirmOpen, setCashConfirmOpen] = useState(false)
  const [paymentAction, setPaymentAction] = useState<'cash' | 'sepay' | null>(null)

  const handleCashConfirm = async () => {
    setPaymentAction('cash')
    try {
      const saved = await onRecordCash(remainingAmount)
      if (saved) setCashConfirmOpen(false)
    } finally {
      setPaymentAction(null)
    }
  }

  const handleSePay = async () => {
    setPaymentAction('sepay')
    try {
      await onCreateSePay()
    } finally {
      setPaymentAction(null)
    }
  }

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
        <Typography variant="h6" sx={{ mb: 2 }}>Thanh toán</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body2">Đã thu: <strong>{formatPrice(paidAmount)}</strong></Typography>
          <Typography variant="body2">Còn phải thu: <strong>{formatPrice(remainingAmount)}</strong></Typography>
        </Stack>
        {payments.length > 0 && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {payments.map((payment) => (
              <Box key={payment.thanhtoan_id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {payment.phuong_thuc === 'chuyen_khoan' ? 'SePay / chuyển khoản' : payment.phuong_thuc === 'tien_mat' ? 'Tiền mặt' : payment.phuong_thuc}
                  {payment.ma_giao_dich ? ` · ${payment.ma_giao_dich}` : ''}
                </Typography>
                <Typography variant="body2" fontWeight={600}>{formatPrice(Number(payment.so_tien))} · {payment.trang_thai === 'thanh_cong' ? 'Đã nhận' : payment.trang_thai === 'dang_xu_ly' ? 'Đang chờ' : payment.trang_thai === 'da_hoan_tien' ? 'Đã hoàn' : 'Thất bại'}</Typography>
              </Box>
            ))}
          </Stack>
        )}
        {pendingSePay && <Alert severity="warning" sx={{ mb: 2 }}>Đơn đang có QR SePay chờ xác nhận. Không ghi thêm tiền mặt khi chưa đối soát QR này.</Alert>}
        {remainingAmount > 0 && !isTerminal && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {order.orderType !== 'dat_truoc' && (
              <Button variant="outlined" startIcon={<PaymentsIcon />} disabled={Boolean(paymentAction) || pendingSePay} onClick={() => setCashConfirmOpen(true)}>
                Ghi nhận đã thu tiền mặt
              </Button>
            )}
            <Button variant="outlined" startIcon={<QrCode2Icon />} disabled={Boolean(paymentAction)} onClick={() => void handleSePay()}>
              {paymentAction === 'sepay' ? 'Đang tạo QR...' : pendingSePay ? 'Mở lại QR SePay' : 'Tạo QR SePay'}
            </Button>
          </Stack>
        )}
      </Box>

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
            {statusOptions.map((s) => (
              <MenuItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</MenuItem>
            ))}
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

      {!isTerminal && (
        <Alert severity="info" sx={{ mb: 3 }}>
          “Hoàn thành” xác nhận khách đã nhận hàng và chỉ được chọn khi đơn đã thanh toán đủ.
          {order.address ? ' Đơn giao tận nơi cần chuyển sang “Đang giao” trước.' : ''}
        </Alert>
      )}

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

      <Dialog open={cashConfirmOpen} onClose={() => !paymentAction && setCashConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Xác nhận đã nhận tiền mặt</DialogTitle>
        <DialogContent>
          <Alert severity="warning">Chỉ xác nhận nếu nhân viên đã thực sự nhận đủ <strong>{formatPrice(remainingAmount)}</strong> từ khách.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCashConfirmOpen(false)} disabled={Boolean(paymentAction)}>Quay lại</Button>
          <Button variant="contained" onClick={() => void handleCashConfirm()} disabled={Boolean(paymentAction) || remainingAmount <= 0}>
            {paymentAction === 'cash' ? 'Đang lưu...' : 'Đã thu đủ tiền'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
