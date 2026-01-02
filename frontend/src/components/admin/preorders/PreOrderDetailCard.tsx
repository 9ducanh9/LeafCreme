// Pre-order Detail Card component - displays full pre-order details
import {
  Box,
  Paper,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { PreOrder } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'

interface PreOrderDetailCardProps {
  preOrder: PreOrder
  onStatusChange: (status: PreOrder['status']) => void
  onNotesChange: (notes: string) => void
  onSaveNotes: () => void
  notesEditing: boolean
  notesValue: string
}

export default function PreOrderDetailCard({
  preOrder,
  onStatusChange,
  onNotesChange,
  onSaveNotes,
  notesEditing,
  notesValue,
}: PreOrderDetailCardProps) {
  const getStatusColor = (status: PreOrder['status']) => {
    const colors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'> = {
      pending: 'warning',
      confirmed: 'primary',
      preparing: 'info',
      ready: 'success',
      done: 'success',
      completed: 'success',
      canceled: 'error',
      cancelled: 'error',
    }
    return colors[status] || 'default'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Paper sx={{ p: 4, borderRadius: 2, border: '1px solid #EFEDE6' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F', mb: 1 }}>
            Đơn hàng {preOrder.orderCode || `#${preOrder.id}`}
          </Typography>
          <Typography variant="body2" sx={{ color: '#7A6F63' }}>
            Tạo lúc: {formatDate(preOrder.createdAt)}
          </Typography>
        </Box>
        <Chip
          label={
            preOrder.status === 'pending' ? 'Chờ xử lý' :
            preOrder.status === 'confirmed' ? 'Đã xác nhận' :
            preOrder.status === 'preparing' ? 'Đang chuẩn bị' :
            preOrder.status === 'done' ? 'Hoàn thành' :
            preOrder.status === 'canceled' ? 'Đã hủy' : preOrder.status
          }
          color={getStatusColor(preOrder.status)}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Customer Info */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ color: '#473C2F', mb: 2, fontWeight: 600 }}>
          Thông tin khách hàng
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ color: '#7A6F63', mb: 0.5 }}>
              Tên khách hàng
            </Typography>
            <Typography variant="body1" sx={{ color: '#473C2F', fontWeight: 500 }}>
              {preOrder.customerName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: '#7A6F63', mb: 0.5 }}>
              Số điện thoại
            </Typography>
            <Typography variant="body1" sx={{ color: '#473C2F', fontWeight: 500 }}>
              {preOrder.phone}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: '#7A6F63', mb: 0.5 }}>
              Ngày lấy
            </Typography>
            <Typography variant="body1" sx={{ color: '#473C2F', fontWeight: 500 }}>
              {formatDate(preOrder.pickupDate)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Status Change */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ color: '#473C2F', mb: 2, fontWeight: 600 }}>
          Status
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Thay đổi trạng thái</InputLabel>
          <Select
            value={preOrder.status}
            label="Thay đổi trạng thái"
            onChange={(e) => onStatusChange(e.target.value as PreOrder['status'])}
          >
            <MenuItem value="pending">Chờ xử lý</MenuItem>
            <MenuItem value="confirmed">Đã xác nhận</MenuItem>
            <MenuItem value="preparing">Đang chuẩn bị</MenuItem>
            <MenuItem value="done">Hoàn thành</MenuItem>
            <MenuItem value="canceled">Đã hủy</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Notes */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ color: '#473C2F', mb: 2, fontWeight: 600 }}>
          Ghi chú
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={notesValue}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Thêm ghi chú về đặt trước này..."
            disabled={!notesEditing}
          />
          {notesEditing && (
            <Button
              variant="contained"
              onClick={onSaveNotes}
              sx={{ bgcolor: '#C59B72', alignSelf: 'flex-start' }}
            >
              Lưu
            </Button>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Order Items */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#473C2F', mb: 2, fontWeight: 600 }}>
          Sản phẩm đặt hàng
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAFAF7' }}>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Sản phẩm</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Kích thước</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                  Số lượng
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                  Giá
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
                  Thành tiền
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {preOrder.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ color: '#473C2F', fontWeight: 500 }}>
                    {item.productName}
                  </TableCell>
                  <TableCell sx={{ color: '#7A6F63' }}>{item.size}</TableCell>
                  <TableCell align="right" sx={{ color: '#7A6F63' }}>
                    {item.quantity}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#7A6F63' }}>
                    {formatPrice(item.price)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#473C2F', fontWeight: 600 }}>
                    {formatPrice(item.price * item.quantity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Total */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2, borderTop: '2px solid #EFEDE6' }}>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h6" sx={{ color: '#473C2F', fontWeight: 600 }}>
            Tổng: {formatPrice(preOrder.totalAmount)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

