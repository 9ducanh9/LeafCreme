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
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>ID</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Khách hàng</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Số điện thoại</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Ngày lấy</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Sản phẩm</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Tổng tiền</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {preOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 8, color: '#9B948B' }}>
                Không tìm thấy đặt trước
              </TableCell>
            </TableRow>
          ) : (
            preOrders.map((order) => (
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
                  #{order.id}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F', py: 2 }}>
                  {order.customerName}
                </TableCell>
                <TableCell sx={{ color: '#7A6F63', py: 2, fontSize: '0.875rem', fontFamily: 'monospace' }}>{order.phone}</TableCell>
                <TableCell sx={{ color: '#7A6F63', py: 2, fontSize: '0.875rem' }}>{formatDate(order.pickupDate)}</TableCell>
                <TableCell sx={{ color: '#7A6F63', py: 2, fontSize: '0.875rem' }} align="right">
                  {order.items.length}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#473C2F', py: 2, fontSize: '0.9375rem' }} align="right">
                  {formatPrice(order.totalAmount)}
                </TableCell>
                <TableCell align="center" sx={{ py: 2 }}>
                  <Chip
                    label={getStatusLabel(order.status)}
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
                      onClick={() => navigate(`/admin/preorders/${order.id}`)}
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

