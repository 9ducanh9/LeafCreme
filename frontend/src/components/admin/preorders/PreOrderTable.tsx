// Pre-order Table component - displays pre-orders in a table
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
import { PreOrder } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'
import { useNavigate } from 'react-router-dom'

interface PreOrderTableProps {
  preOrders: PreOrder[]
  onDelete: (id: string) => void
}

export default function PreOrderTable({ preOrders, onDelete }: PreOrderTableProps) {
  const navigate = useNavigate()

  const getStatusColor = (status: PreOrder['status']) => {
    const colors: Record<PreOrder['status'], 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
      pending: 'warning',
      confirmed: 'primary',
      preparing: 'info',
      done: 'success',
      canceled: 'error',
    }
    return colors[status] || 'default'
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

  const getStatusLabel = (status: PreOrder['status']) => {
    const labels: Record<PreOrder['status'], string> = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      preparing: 'Đang chuẩn bị',
      done: 'Hoàn thành',
      canceled: 'Đã hủy',
    }
    return labels[status]
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #EFEDE6' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#FAFAF7' }}>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>ID</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Khách hàng</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Số điện thoại</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Ngày lấy</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Sản phẩm</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Tổng tiền</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {preOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#7A6F63' }}>
                Không tìm thấy đặt trước
              </TableCell>
            </TableRow>
          ) : (
            preOrders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell sx={{ color: '#7A6F63', fontFamily: 'monospace' }}>
                  #{order.id}
                </TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#473C2F' }}>
                  {order.customerName}
                </TableCell>
                <TableCell sx={{ color: '#7A6F63' }}>{order.phone}</TableCell>
                <TableCell sx={{ color: '#7A6F63' }}>{formatDate(order.pickupDate)}</TableCell>
                <TableCell sx={{ color: '#7A6F63' }}>
                  {order.items.length} sản phẩm
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>
                  {formatPrice(order.totalAmount)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(order.status)}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin/preorders/${order.id}`)}
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

