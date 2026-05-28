// Sales Detail Card component - displays full order details
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { Order } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'

interface SalesDetailCardProps {
  order: Order
  onStatusChange: (status: Order['status']) => void
}

export default function SalesDetailCard({ order, onStatusChange }: SalesDetailCardProps) {
  const getStatusColor = (status: Order['status']) => {
    const colors: Record<Order['status'], 'default' | 'primary' | 'info' | 'warning' | 'success' | 'error'> = {
      pending: 'warning',
      processing: 'info',
      delivering: 'primary',
      completed: 'success',
      canceled: 'error',
    }
    return colors[status] || 'default'
  }

  const getTypeLabel = (type: Order['orderType']) => {
    const labels: Record<Order['orderType'], string> = {
      online: 'Online',
      pos: 'POS',
      preorder: 'Pre-order',
    }
    return labels[type]
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      tien_mat: 'Tiền mặt',
      chuyen_khoan: 'Chuyển khoản',
      the: 'Thẻ',
      vi_dien_tu: 'Ví điện tử',
    }
    return labels[method] || method
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
            Đơn hàng #{order.id}
          </Typography>
          <Typography variant="body2" sx={{ color: '#7A6F63' }}>
            Ngày: {formatDate(order.date)}
          </Typography>
        </Box>
        <Chip
          label={
            order.status === 'pending' ? 'Chờ xử lý' :
            order.status === 'processing' ? 'Đang xử lý' :
            order.status === 'delivering' ? 'Đang giao' :
            order.status === 'completed' ? 'Hoàn thành' :
            order.status === 'canceled' ? 'Đã hủy' : order.status
          }
          color={getStatusColor(order.status)}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Order Info */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ color: '#473C2F', mb: 2, fontWeight: 600 }}>
          Thông tin đơn hàng
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ color: '#7A6F63', mb: 0.5 }}>
              Tên khách hàng
            </Typography>
            <Typography variant="body1" sx={{ color: '#473C2F', fontWeight: 500 }}>
              {order.customerName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: '#7A6F63', mb: 0.5 }}>
              Loại đơn hàng
            </Typography>
            <Chip
              label={getTypeLabel(order.orderType)}
              size="small"
              sx={{
                bgcolor: order.orderType === 'online' ? '#F5C96A' : '#E8E5DD',
                color: '#473C2F',
                fontWeight: 500,
              }}
            />
          </Box>
          <Box>
            <Typography variant="body2" sx={{ color: '#7A6F63', mb: 0.5 }}>
              Phương thức thanh toán
            </Typography>
            <Typography variant="body1" sx={{ color: '#473C2F', fontWeight: 500 }}>
              {getPaymentMethodLabel(order.paymentMethod)}
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
            value={order.status}
            label="Thay đổi trạng thái"
            onChange={(e) => onStatusChange(e.target.value as Order['status'])}
          >
            <MenuItem value="pending">Chờ xử lý</MenuItem>
            <MenuItem value="processing">Đang xử lý</MenuItem>
            <MenuItem value="delivering">Đang giao</MenuItem>
            <MenuItem value="completed">Hoàn thành</MenuItem>
            <MenuItem value="canceled">Đã hủy</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Order Items */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#473C2F', mb: 2, fontWeight: 600 }}>
          Sản phẩm đơn hàng
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
              {order.items.map((item, index) => (
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
            Tổng: {formatPrice(order.totalAmount)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

