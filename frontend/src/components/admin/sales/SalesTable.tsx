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
    <TableContainer 
      component={Paper} 
      sx={{ 
        borderRadius: '16px',
        border: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
      }}
    >
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#F7F6F3' }}>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Mã đơn</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Loại</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Khách hàng</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Ngày</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Sản phẩm</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Tổng tiền</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Thanh toán</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 8, color: '#9B948B' }}>
                Không tìm thấy đơn hàng
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow 
                key={order.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  '&:hover': { 
                    bgcolor: '#FAFAF9',
                    '& .action-buttons': {
                      opacity: 1
                    }
                  }
                }}
              >
                <TableCell sx={{ color: '#9B948B', fontFamily: 'monospace', fontWeight: 600, py: 2, fontSize: '0.8125rem' }}>
                  {order.id}
                </TableCell>
                <TableCell align="center" sx={{ py: 2 }}>
                  <Chip
                    label={getTypeLabel(order.orderType)}
                    size="small"
                    sx={{
                      bgcolor: order.orderType === 'online' 
                        ? 'rgba(245, 201, 106, 0.15)' 
                        : 'rgba(232, 229, 221, 0.5)',
                      color: order.orderType === 'online' ? '#C59B72' : '#7A6F63',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F', py: 2 }}>
                  {order.customerName}
                </TableCell>
                <TableCell sx={{ color: '#7A6F63', py: 2, fontSize: '0.875rem' }}>{formatDate(order.date)}</TableCell>
                <TableCell sx={{ color: '#7A6F63', py: 2, fontSize: '0.875rem' }} align="right">
                  {order.items.length}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#473C2F', py: 2, fontSize: '0.9375rem' }} align="right">
                  {formatPrice(order.totalAmount)}
                </TableCell>
                <TableCell sx={{ color: '#7A6F63', fontSize: '0.8125rem', py: 2 }}>
                  {getPaymentMethodLabel(order.paymentMethod)}
                </TableCell>
                <TableCell align="center" sx={{ py: 2 }}>
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
                    sx={{
                      fontSize: '0.75rem',
                      height: '24px',
                      borderRadius: '12px',
                      fontWeight: 600
                    }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ py: 2 }}>
                  <Box 
                    className="action-buttons"
                    sx={{ 
                      display: 'flex', 
                      gap: 0.5, 
                      justifyContent: 'flex-end',
                      opacity: 0,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin/sales/${order.id}`)}
                      sx={{ 
                        color: '#C59B72',
                        '&:hover': {
                          bgcolor: 'rgba(197, 155, 114, 0.1)'
                        }
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(order.id)}
                      sx={{ 
                        color: '#d32f2f',
                        '&:hover': {
                          bgcolor: 'rgba(211, 47, 47, 0.1)'
                        }
                      }}
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

