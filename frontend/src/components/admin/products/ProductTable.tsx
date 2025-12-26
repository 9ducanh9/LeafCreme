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
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Hình ảnh</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Tên</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Mô tả</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Danh mục</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Giá</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Kích thước</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>SKU</TableCell>
            <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">
              Thao tác
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 8, color: '#9B948B' }}>
                Không tìm thấy sản phẩm
              </TableCell>
            </TableRow>
          ) : (
            variants.map((variant) => (
              <TableRow 
                key={variant.id}
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
                <TableCell sx={{ py: 2 }}>
                  <Avatar
                    src={variant.image ? getImageUrl(variant.image) : undefined}
                    alt={variant.name}
                    variant="rounded"
                    sx={{ width: 48, height: 48, borderRadius: '8px' }}
                  >
                    {variant.name.charAt(0).toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F', py: 2 }}>{variant.name}</TableCell>
                <TableCell sx={{ color: '#7A6F63', maxWidth: 300, py: 2, fontSize: '0.875rem' }}>
                  {variant.description}
                </TableCell>
                <TableCell sx={{ py: 2 }}>
                  <Chip
                    label={variant.category}
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
                  {formatPrice(variant.price)}
                </TableCell>
                <TableCell sx={{ py: 2 }} align="center">
                  <Chip
                    label={variant.size}
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
                <TableCell sx={{ py: 2 }} align="center">
                  <Chip
                    label={variant.status === 'active' ? 'Hoạt động' : 'Ẩn'}
                    color={getStatusColor(variant.status)}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      height: '24px',
                      borderRadius: '12px',
                      fontWeight: 600
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#9B948B', fontSize: '0.8125rem', py: 2, fontFamily: 'monospace' }}>
                  {variant.sku || '-'}
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
                      onClick={() => onEdit(variant)}
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
                      onClick={() => onDelete(variant.id)}
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

