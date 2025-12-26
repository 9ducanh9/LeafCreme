// Voucher Table component - displays vouchers in a table
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
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { Voucher } from '../../../types/admin'

interface VoucherTableProps {
  vouchers: Voucher[]
  onEdit: (voucher: Voucher) => void
  onDelete: (id: string) => void
}

export default function VoucherTable({ vouchers, onEdit, onDelete }: VoucherTableProps) {
  const getStatusColor = (status: Voucher['status']) => {
    return status === 'active' ? 'success' : 'default'
  }

  const getTypeLabel = (type: Voucher['type']) => {
    return type === 'percent' ? '%' : 'VND'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
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
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Mã</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Loại</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Giảm giá</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Áp dụng cho</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Đơn tối thiểu</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Giới hạn</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Hết hạn</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vouchers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 8, color: '#9B948B' }}>
                Không tìm thấy mã giảm giá
              </TableCell>
            </TableRow>
          ) : (
            vouchers.map((voucher) => (
              <TableRow 
                key={voucher.id}
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
                <TableCell sx={{ fontWeight: 700, color: '#473C2F', fontFamily: 'monospace', py: 2, fontSize: '0.875rem' }}>
                  {voucher.code}
                </TableCell>
                <TableCell align="center" sx={{ py: 2 }}>
                  <Chip
                    label={voucher.type === 'percent' ? 'Phần trăm' : 'Số tiền'}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(245, 201, 106, 0.15)',
                      color: '#C59B72',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#473C2F', py: 2, fontSize: '0.9375rem' }} align="right">
                  {voucher.discountValue}
                  {getTypeLabel(voucher.type)}
                </TableCell>
                <TableCell align="center" sx={{ py: 2 }}>
                  <Chip
                    label={
                      voucher.appliesTo === 'all'
                        ? 'Tất cả'
                        : voucher.appliesTo === 'category'
                        ? 'Danh mục'
                        : 'Sản phẩm'
                    }
                    size="small"
                    sx={{
                      bgcolor: 'rgba(232, 229, 221, 0.5)',
                      color: '#7A6F63',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#7A6F63', py: 2, fontSize: '0.875rem' }} align="right">
                  {voucher.minOrderValue ? `${voucher.minOrderValue.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell sx={{ color: '#7A6F63', py: 2, fontSize: '0.875rem' }} align="right">
                  {voucher.usageLimit || '∞'}
                </TableCell>
                <TableCell
                  sx={{
                    color: isExpired(voucher.expiresAt) ? '#d32f2f' : '#7A6F63',
                    fontWeight: isExpired(voucher.expiresAt) ? 600 : 500,
                    py: 2,
                    fontSize: '0.875rem'
                  }}
                >
                  {formatDate(voucher.expiresAt)}
                </TableCell>
                <TableCell align="center" sx={{ py: 2 }}>
                  <Chip
                    label={voucher.status === 'active' ? 'Hoạt động' : 'Tắt'}
                    color={getStatusColor(voucher.status)}
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
                      onClick={() => onEdit(voucher)}
                      sx={{ 
                        color: '#C59B72',
                        '&:hover': {
                          bgcolor: 'rgba(197, 155, 114, 0.1)'
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(voucher.id)}
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

