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
    <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #EFEDE6' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#FAFAF7' }}>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Mã</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Loại</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Giảm giá</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Áp dụng cho</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Đơn tối thiểu</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Giới hạn sử dụng</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Hết hạn</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vouchers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#7A6F63' }}>
                Không tìm thấy mã giảm giá
              </TableCell>
            </TableRow>
          ) : (
            vouchers.map((voucher) => (
              <TableRow key={voucher.id} hover>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F', fontFamily: 'monospace' }}>
                  {voucher.code}
                </TableCell>
                <TableCell>
                  <Chip
                    label={voucher.type === 'percent' ? 'Phần trăm' : 'Số tiền cố định'}
                    size="small"
                    sx={{
                      bgcolor: '#F5C96A',
                      color: '#473C2F',
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>
                  {voucher.discountValue}
                  {getTypeLabel(voucher.type)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      voucher.appliesTo === 'all'
                        ? 'Tất cả sản phẩm'
                        : voucher.appliesTo === 'category'
                        ? 'Danh mục'
                        : 'Sản phẩm'
                    }
                    size="small"
                    sx={{
                      bgcolor: '#E8E5DD',
                      color: '#473C2F',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#7A6F63' }}>
                  {voucher.minOrderValue ? `${voucher.minOrderValue.toLocaleString()} VND` : '-'}
                </TableCell>
                <TableCell sx={{ color: '#7A6F63' }}>
                  {voucher.usageLimit || 'Không giới hạn'}
                </TableCell>
                <TableCell
                  sx={{
                    color: isExpired(voucher.expiresAt) ? '#d32f2f' : '#7A6F63',
                    fontWeight: isExpired(voucher.expiresAt) ? 600 : 400,
                  }}
                >
                  {formatDate(voucher.expiresAt)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={voucher.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                    color={getStatusColor(voucher.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(voucher)}
                      sx={{ color: '#C59B72' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(voucher.id)}
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

