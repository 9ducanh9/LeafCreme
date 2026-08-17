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
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Mã</TableCell>
            <TableCell align="center">Loại</TableCell>
            <TableCell align="right">Giảm giá</TableCell>
            <TableCell align="center">Áp dụng cho</TableCell>
            <TableCell align="right">Đơn tối thiểu</TableCell>
            <TableCell align="right">Giới hạn</TableCell>
            <TableCell>Hết hạn</TableCell>
            <TableCell align="center">Trạng thái</TableCell>
            <TableCell align="right">Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vouchers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 8, color: 'text.disabled' }}>
                Không tìm thấy mã giảm giá
              </TableCell>
            </TableRow>
          ) : (
            vouchers.map((voucher) => (
              <TableRow key={voucher.id} sx={{ cursor: 'pointer', '&:hover .action-buttons': { opacity: 1 } }}>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'monospace' }}>
                  {voucher.code}
                </TableCell>
                <TableCell align="center">
                  <Chip label={voucher.type === 'percent' ? 'Phần trăm' : 'Số tiền'} size="small" color="warning" variant="outlined" />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }} align="right">
                  {voucher.discountValue}
                  {getTypeLabel(voucher.type)}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={voucher.appliesTo === 'all' ? 'Tất cả' : voucher.appliesTo === 'category' ? 'Danh mục' : 'Sản phẩm'}
                    size="small"
                    sx={{ bgcolor: 'grey.100', color: 'text.secondary' }}
                  />
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }} align="right">
                  {voucher.minOrderValue ? `${voucher.minOrderValue.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }} align="right">
                  {voucher.usageLimit || '∞'}
                </TableCell>
                <TableCell sx={{ color: isExpired(voucher.expiresAt) ? 'error.main' : 'text.secondary', fontWeight: isExpired(voucher.expiresAt) ? 600 : 500 }}>
                  {formatDate(voucher.expiresAt)}
                </TableCell>
                <TableCell align="center">
                  <Chip label={voucher.status === 'active' ? 'Hoạt động' : 'Tắt'} color={getStatusColor(voucher.status)} size="small" />
                </TableCell>
                <TableCell align="right">
                  <Box className="action-buttons" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', opacity: 0, transition: 'opacity 0.2s ease' }}>
                    <IconButton size="small" color="primary" onClick={() => onEdit(voucher)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(voucher.id)}><DeleteIcon fontSize="small" /></IconButton>
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

