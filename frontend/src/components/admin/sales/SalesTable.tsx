// Sales Table component - displays orders in a table
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import { Order } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'
import { useNavigate } from 'react-router-dom'

interface SalesTableProps {
  orders: Order[]
  onDelete: (id: string) => void
}

export default function SalesTable({ orders, onDelete }: SalesTableProps) {
  const navigate = useNavigate()

  const getStatusColor = (status: Order['status']) => {
    const colors: Record<Order['status'], 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
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
      online: 'Trực tuyến',
      pos: 'Tại cửa hàng',
      preorder: 'Đặt trước',
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #EFEDE6' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#FAFAF7' }}>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Mã đơn</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Loại</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Khách hàng</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Ngày</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Sản phẩm</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Tổng tiền</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Thanh toán</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#7A6F63' }}>
                Không tìm thấy đơn hàng
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell sx={{ color: '#7A6F63', fontFamily: 'monospace', fontWeight: 500 }}>
                  {order.id}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getTypeLabel(order.orderType)}
                    size="small"
                    sx={{
                      bgcolor: order.orderType === 'online' ? '#F5C96A' : '#E8E5DD',
                      color: '#473C2F',
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#473C2F' }}>
                  {order.customerName}
                </TableCell>
                <TableCell sx={{ color: '#7A6F63' }}>{formatDate(order.date)}</TableCell>
                <TableCell sx={{ color: '#7A6F63' }}>
                  {order.items.length} sản phẩm
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>
                  {formatPrice(order.totalAmount)}
                </TableCell>
                <TableCell sx={{ color: '#7A6F63', fontSize: '0.875rem' }}>
                  {getPaymentMethodLabel(order.paymentMethod)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      order.status === 'pending' ? 'Chờ xử lý' :
                      order.status === 'processing' ? 'Đang xử lý' :
                      order.status === 'delivering' ? 'Đang giao' :
                      order.status === 'completed' ? 'Hoàn thành' :
                      order.status === 'canceled' ? 'Đã hủy' : order.status
                    }
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin/sales/${order.id}`)}
                      sx={{ color: '#C59B72' }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(order.id)}
                      sx={{ color: '#d32f2f' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

