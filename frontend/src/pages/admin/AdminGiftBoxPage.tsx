// Admin Gift Box Management Page
import { useState, useEffect, useCallback } from 'react'
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, TextField, MenuItem, CircularProgress } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import InventoryIcon from '@mui/icons-material/Inventory'
import {
  getGiftBoxes,
  createGiftBox,
  updateGiftBox,
  deleteGiftBox,
  type GiftBoxCreate,
  type GiftBoxUpdate,
  type GiftBoxFilters,
} from '../../services/admin/giftBoxService'
import { BackendGiftBox } from '../../types/giftBox'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/ui/Modal'
import { getImageUrl } from '../../utils/getImageUrl'

export default function AdminGiftBoxPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [giftBoxes, setGiftBoxes] = useState<BackendGiftBox[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingGiftBox, setEditingGiftBox] = useState<BackendGiftBox | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState<GiftBoxCreate>({
    ten_hop_qua: '',
    sku: '',
    gia_ban: 0,
    mo_ta: '',
    hinh_anh_url: '',
    kich_thuoc: '',
    trong_luong: undefined,
    dang_hoat_dong: true,
  })

  const loadGiftBoxes = useCallback(async () => {
    setLoading(true)
    try {
      const filters: GiftBoxFilters = {}
      if (search) filters.search = search
      if (statusFilter === 'active') filters.dang_hoat_dong = true
      if (statusFilter === 'inactive') filters.dang_hoat_dong = false
      
      const data = await getGiftBoxes(filters)
      console.log('Gift boxes loaded:', data)
      setGiftBoxes(data)
    } catch (error: unknown) {
      console.error('Error loading gift boxes:', error)
      
      // Check if it's a network/CORS error
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          showError('Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.')
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          showError('⚠️ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
          // Redirect to login after 2 seconds
          setTimeout(() => {
            localStorage.removeItem('access_token')
            window.location.href = '/login'
          }, 2000)
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          showError('⚠️ Bạn không có quyền truy cập. Vui lòng đăng nhập bằng tài khoản admin/manager.')
          // Redirect to login after 2 seconds
          setTimeout(() => {
            localStorage.removeItem('access_token')
            window.location.href = '/login'
          }, 2000)
        } else {
          showError(error.message || 'Không thể tải danh sách hộp quà')
        }
      } else {
        showError('Không thể tải danh sách hộp quà. Vui lòng thử lại sau.')
      }
      
      // Set empty array to avoid undefined errors
      setGiftBoxes([])
    } finally {
      setLoading(false)
    }
  }, [search, showError, statusFilter])

  useEffect(() => {
    loadGiftBoxes()
  }, [loadGiftBoxes])

  const handleCreate = () => {
    setEditingGiftBox(null)
    setFormData({
      ten_hop_qua: '',
      sku: '',
      gia_ban: 0,
      mo_ta: '',
      hinh_anh_url: '',
      kich_thuoc: '',
      trong_luong: undefined,
      dang_hoat_dong: true,
    })
    setFormOpen(true)
  }

  const handleEdit = (giftBox: BackendGiftBox) => {
    setEditingGiftBox(giftBox)
    setFormData({
      ten_hop_qua: giftBox.ten_hop_qua,
      sku: giftBox.sku || '',
      gia_ban: Number(giftBox.gia_ban),
      mo_ta: giftBox.mo_ta || '',
      hinh_anh_url: giftBox.hinh_anh_url || '',
      kich_thuoc: giftBox.kich_thuoc || '',
      trong_luong: giftBox.trong_luong ? Number(giftBox.trong_luong) : undefined,
      dang_hoat_dong: giftBox.dang_hoat_dong,
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingGiftBox) {
        await updateGiftBox(editingGiftBox.hop_qua_id, formData as GiftBoxUpdate)
        showSuccess('Cập nhật hộp quà thành công')
      } else {
        await createGiftBox(formData)
        showSuccess('Tạo hộp quà thành công')
      }
      await loadGiftBoxes()
      setFormOpen(false)
      setEditingGiftBox(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể lưu hộp quà')
    }
  }

  const handleDelete = (id: number) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    try {
      await deleteGiftBox(deleteConfirm.id)
      showSuccess('Xóa hộp quà thành công')
      await loadGiftBoxes()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể xóa hộp quà')
    } finally {
      setDeleteConfirm({ open: false, id: null })
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          Quản lý hộp quà
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{ 
            bgcolor: '#C59B72',
            color: 'white',
            borderRadius: '12px',
            px: 3,
            py: 1.25,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem',
            boxShadow: '0 4px 12px rgba(197, 155, 114, 0.25)',
            transition: 'all 0.2s ease',
            '&:hover': { 
              bgcolor: '#B0895F',
              boxShadow: '0 6px 20px rgba(197, 155, 114, 0.35)',
              transform: 'translateY(-2px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          Tạo hộp quà
        </Button>
      </Box>

      {/* Filters */}
      <Paper 
        sx={{ 
          p: 2.5, 
          mb: 3, 
          border: 'none',
          borderRadius: '16px',
          bgcolor: '#FAFAF9',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
          <TextField
            label="Tìm kiếm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            placeholder="Tìm theo tên hoặc SKU..."
            sx={{ 
              flex: 1,
              minWidth: 220,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                bgcolor: 'white',
                '& fieldset': {
                  borderColor: 'rgba(122, 111, 99, 0.15)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(122, 111, 99, 0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#C59B72',
                },
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.875rem',
                fontWeight: 500,
                '&.Mui-focused': {
                  color: '#C59B72',
                },
              },
            }}
          />
          <TextField
            select
            label="Trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ 
              minWidth: 160,
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                bgcolor: 'white',
                '& fieldset': {
                  borderColor: 'rgba(122, 111, 99, 0.15)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(122, 111, 99, 0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#C59B72',
                },
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.875rem',
                fontWeight: 500,
                '&.Mui-focused': {
                  color: '#C59B72',
                },
              },
            }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="active">Đang hoạt động</MenuItem>
            <MenuItem value="inactive">Không hoạt động</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
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
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">ID</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Tên hộp quà</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Giá bán</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="center">Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }} align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {giftBoxes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8, color: '#9B948B' }}>
                    Không có hộp quà nào
                  </TableCell>
                </TableRow>
              ) : (
                giftBoxes.map((gb) => (
                  <TableRow 
                    key={gb.hop_qua_id}
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
                    <TableCell sx={{ color: '#9B948B', fontWeight: 600, py: 2, fontSize: '0.8125rem' }} align="right">{gb.hop_qua_id}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#473C2F', py: 2 }}>{gb.ten_hop_qua}</TableCell>
                    <TableCell sx={{ color: '#9B948B', py: 2, fontSize: '0.8125rem', fontFamily: 'monospace' }}>{gb.sku || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#473C2F', py: 2, fontSize: '0.9375rem' }} align="right">{formatPrice(Number(gb.gia_ban))}</TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Chip
                        label={gb.dang_hoat_dong ? 'Hoạt động' : 'Tắt'}
                        color={gb.dang_hoat_dong ? 'success' : 'default'}
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
                          onClick={() => navigate(`/admin/gift-boxes/${gb.hop_qua_id}/bom`)}
                          sx={{ 
                            color: '#7A6F63',
                            '&:hover': {
                              bgcolor: 'rgba(122, 111, 99, 0.1)'
                            }
                          }}
                          title="Quản lý BOM"
                        >
                          <InventoryIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(gb)}
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
                          onClick={() => handleDelete(gb.hop_qua_id)}
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
      )}

      {/* Form Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingGiftBox(null)
        }}
        title={editingGiftBox ? 'Chỉnh sửa hộp quà' : 'Tạo hộp quà mới'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outlined"
              onClick={() => {
                setFormOpen(false)
                setEditingGiftBox(null)
              }}
              sx={{
                borderColor: 'rgba(122, 111, 99, 0.3)',
                color: 'rgba(71, 60, 47, 0.85)',
                borderRadius: '12px',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9375rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(122, 111, 99, 0.5)',
                  bgcolor: 'rgba(122, 111, 99, 0.04)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
            >
              Hủy
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              sx={{
                bgcolor: '#C59B72',
                color: 'white',
                borderRadius: '12px',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                boxShadow: '0 4px 12px rgba(197, 155, 114, 0.25)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#B0895F',
                  boxShadow: '0 6px 20px rgba(197, 155, 114, 0.35)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
            >
              {editingGiftBox ? 'Cập nhật' : 'Tạo'}
            </Button>
          </div>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Thông tin cơ bản */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Tên hộp quà"
              value={formData.ten_hop_qua}
              onChange={(e) => setFormData({ ...formData, ten_hop_qua: e.target.value })}
              fullWidth
              required
              placeholder="VD: Hộp quà tết cao cấp"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#C59B72',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(71, 60, 47, 0.75)',
                  '&.Mui-focused': {
                    color: '#C59B72',
                  },
                  '&.MuiInputLabel-shrink': {
                    fontWeight: 600,
                  },
                },
              }}
            />
            <TextField
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              fullWidth
              placeholder="Mã định danh sản phẩm"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#C59B72',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(71, 60, 47, 0.75)',
                  '&.Mui-focused': {
                    color: '#C59B72',
                  },
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.75rem',
                  color: 'rgba(71, 60, 47, 0.6)',
                },
              }}
            />
            <TextField
              label="Giá bán"
              type="number"
              value={formData.gia_ban}
              onChange={(e) => setFormData({ ...formData, gia_ban: Number(e.target.value) })}
              fullWidth
              required
              inputProps={{ min: 0, step: 1000 }}
              placeholder="0"
              helperText="Đơn vị: VNĐ"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#C59B72',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(71, 60, 47, 0.75)',
                  '&.Mui-focused': {
                    color: '#C59B72',
                  },
                  '&.MuiInputLabel-shrink': {
                    fontWeight: 600,
                  },
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.75rem',
                  color: 'rgba(71, 60, 47, 0.6)',
                },
              }}
            />
          </Box>

          {/* Mô tả & Hình ảnh */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5, borderTop: '1px solid rgba(122, 111, 99, 0.1)' }}>
            <TextField
              label="Mô tả"
              value={formData.mo_ta}
              onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Mô tả ngắn gọn về hộp quà..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#C59B72',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(71, 60, 47, 0.75)',
                  '&.Mui-focused': {
                    color: '#C59B72',
                  },
                },
              }}
            />
            <TextField
              label="URL hình ảnh"
              value={formData.hinh_anh_url}
              onChange={(e) => setFormData({ ...formData, hinh_anh_url: e.target.value })}
              fullWidth
              placeholder="product/xxx.jpg hoặc giftboxes/xxx.jpg"
              helperText="Có thể nhập đường dẫn tương đối (product/xxx.jpg) hoặc URL đầy đủ"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#C59B72',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(71, 60, 47, 0.75)',
                  '&.Mui-focused': {
                    color: '#C59B72',
                  },
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.75rem',
                  color: 'rgba(71, 60, 47, 0.6)',
                },
              }}
            />
            {/* Image Preview */}
            {formData.hinh_anh_url && (
              <Box sx={{ mt: 0 }}>
                <img
                  src={getImageUrl(formData.hinh_anh_url)}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    objectFit: 'contain',
                    borderRadius: '12px',
                    border: '1px solid rgba(122, 111, 99, 0.15)',
                    padding: '8px',
                    backgroundColor: '#FAFAF9',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Thông số kỹ thuật */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5, borderTop: '1px solid rgba(122, 111, 99, 0.1)' }}>
            <TextField
              label="Kích thước"
              value={formData.kich_thuoc}
              onChange={(e) => setFormData({ ...formData, kich_thuoc: e.target.value })}
              fullWidth
              placeholder="VD: 30cm x 20cm x 15cm"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#C59B72',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(71, 60, 47, 0.75)',
                  '&.Mui-focused': {
                    color: '#C59B72',
                  },
                },
              }}
            />
            <TextField
              label="Trọng lượng"
              type="number"
              value={formData.trong_luong || ''}
              onChange={(e) => setFormData({ ...formData, trong_luong: e.target.value ? Number(e.target.value) : undefined })}
              fullWidth
              inputProps={{ min: 0, step: 0.1 }}
              placeholder="0"
              helperText="Đơn vị: kg"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(122, 111, 99, 0.35)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#C59B72',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'rgba(71, 60, 47, 0.75)',
                  '&.Mui-focused': {
                    color: '#C59B72',
                  },
                },
                '& .MuiFormHelperText-root': {
                  fontSize: '0.75rem',
                  color: 'rgba(71, 60, 47, 0.6)',
                },
              }}
            />
          </Box>

          {/* Trạng thái */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            pt: 1.5, 
            borderTop: '1px solid rgba(122, 111, 99, 0.1)',
            px: 0.5,
          }}>
            <input
              type="checkbox"
              id="dang_hoat_dong"
              checked={formData.dang_hoat_dong}
              onChange={(e) => setFormData({ ...formData, dang_hoat_dong: e.target.checked })}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#C59B72',
              }}
            />
            <label 
              htmlFor="dang_hoat_dong"
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'rgba(71, 60, 47, 0.85)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Đang hoạt động
            </label>
          </Box>
        </Box>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        message="Bạn có chắc chắn muốn xóa hộp quà này? Tất cả BOM sẽ bị xóa theo."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        variant="danger"
      />
    </Box>
  )
}

