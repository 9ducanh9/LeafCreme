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
    <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #EFEDE6' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: '#FAFAF7' }}>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Hình ảnh</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Tên</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Mô tả</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Danh mục</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Giá</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Kích thước</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>SKU</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#473C2F' }} align="right">
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#7A6F63' }}>
                Không tìm thấy sản phẩm
              </TableCell>
            </TableRow>
          ) : (
            variants.map((variant) => (
              <TableRow key={variant.id} hover>
                <TableCell>
                  <Avatar
                    src={variant.image ? getImageUrl(variant.image) : undefined}
                    alt={variant.name}
                    variant="rounded"
                    sx={{ width: 56, height: 56 }}
                  >
                    {variant.name.charAt(0).toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#473C2F' }}>{variant.name}</TableCell>
                <TableCell sx={{ color: '#7A6F63', maxWidth: 300 }}>
                  {variant.description}
                </TableCell>
                <TableCell>
                  <Chip
                    label={variant.category}
                    size="small"
                    sx={{
                      bgcolor: '#F5C96A',
                      color: '#473C2F',
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>
                  {formatPrice(variant.price)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={variant.size}
                    size="small"
                    sx={{
                      bgcolor: '#E8E5DD',
                      color: '#473C2F',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={variant.status === 'active' ? 'Hoạt động' : 'Ẩn'}
                    color={getStatusColor(variant.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ color: '#7A6F63', fontSize: '0.875rem' }}>
                  {variant.sku || '-'}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(variant)}
                      sx={{ color: '#C59B72' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(variant.id)}
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

