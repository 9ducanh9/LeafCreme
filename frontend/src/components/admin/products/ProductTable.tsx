// Product Table component - displays product variants in a table
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
  Avatar,
  Box,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { ProductVariant } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'
import { getImageUrl } from '../../../utils/getImageUrl'

interface ProductTableProps {
  variants: ProductVariant[]
  onEdit: (variant: ProductVariant) => void
  onDelete: (id: string) => void
}

export default function ProductTable({ variants, onEdit, onDelete }: ProductTableProps) {
  const getStatusColor = (status: ProductVariant['status']) => {
    return status === 'active' ? 'success' : 'default'
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Hình ảnh</TableCell>
            <TableCell>Tên</TableCell>
            <TableCell>Mô tả</TableCell>
            <TableCell>Danh mục</TableCell>
            <TableCell align="right">Giá</TableCell>
            <TableCell align="center">Kích thước</TableCell>
            <TableCell align="center">Trạng thái</TableCell>
            <TableCell>SKU</TableCell>
            <TableCell align="right">Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 8, color: 'text.disabled' }}>
                Không tìm thấy sản phẩm
              </TableCell>
            </TableRow>
          ) : (
            variants.map((variant, index) => (
              <TableRow
                key={`${variant.id}-${index}`}
                sx={{ cursor: 'pointer', '&:hover .action-buttons': { opacity: 1 } }}
              >
                <TableCell>
                  <Avatar src={variant.image ? getImageUrl(variant.image) : undefined} alt={variant.name} variant="rounded" sx={{ width: 48, height: 48 }}>
                    {variant.name.charAt(0).toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{variant.name}</TableCell>
                <TableCell sx={{ color: 'text.secondary', maxWidth: 300 }}>{variant.description}</TableCell>
                <TableCell>
                  <Chip label={variant.category} size="small" color="warning" variant="outlined" />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }} align="right">
                  {formatPrice(variant.price)}
                </TableCell>
                <TableCell align="center">
                  <Chip label={variant.size} size="small" sx={{ bgcolor: 'grey.100', color: 'text.secondary' }} />
                </TableCell>
                <TableCell align="center">
                  <Chip label={variant.status === 'active' ? 'Hoạt động' : 'Ẩn'} color={getStatusColor(variant.status)} size="small" />
                </TableCell>
                <TableCell sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                  {variant.sku || '-'}
                </TableCell>
                <TableCell align="right">
                  <Box className="action-buttons" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', opacity: 0, transition: 'opacity 0.2s ease' }}>
                    <IconButton size="small" color="primary" onClick={() => onEdit(variant)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(variant.id)}><DeleteIcon fontSize="small" /></IconButton>
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

