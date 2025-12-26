// Admin Gift Box BOM Editor Page
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, Paper, TextField, MenuItem, CircularProgress, Chip, Button as MuiButton } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  getGiftBoxById,
  getGiftBoxBom,
  addBomItem,
  updateBomItem,
  deleteBomItem,
} from '../../services/admin/giftBoxService'
import { getProductVariants } from '../../services/admin/productService'
import { BomItem } from '../../types/giftBox'
import type { BackendGiftBox } from '../../types/giftBox'
import { ProductVariant } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function AdminGiftBoxBomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const giftBoxId = parseInt(id || '0')

  const [giftBox, setGiftBox] = useState<BackendGiftBox | null>(null)
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; bomId: number | null }>({
    open: false,
    bomId: null,
  })

  // Filters for variant selection
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [box, bom, allVariants] = await Promise.all([
        getGiftBoxById(giftBoxId),
        getGiftBoxBom(giftBoxId),
        getProductVariants({ category: categoryFilter, size: sizeFilter, search: searchFilter }),
      ])
      setGiftBox(box)
      setBomItems(bom)
      setVariants(allVariants)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, giftBoxId, searchFilter, showError, sizeFilter])

  useEffect(() => {
    if (giftBoxId) {
      loadData()
    }
  }, [giftBoxId, loadData])

  const handleAddBomItem = async () => {
    if (!selectedVariantId || quantity <= 0) {
      showError('Vui lòng chọn biến thể và nhập số lượng > 0')
      return
    }

    try {
      await addBomItem(giftBoxId, parseInt(selectedVariantId), quantity)
      showSuccess('Đã thêm vào BOM')
      await loadData()
      setSelectedVariantId('')
      setQuantity(1)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể thêm vào BOM')
    }
  }

  const handleUpdateQuantity = async (bomId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      showError('Số lượng phải > 0')
      return
    }

    try {
      await updateBomItem(giftBoxId, bomId, newQuantity)
      showSuccess('Đã cập nhật số lượng')
      await loadData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể cập nhật')
    }
  }

  const handleDelete = (bomId: number) => {
    setDeleteConfirm({ open: true, bomId })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.bomId) return
    try {
      await deleteBomItem(giftBoxId, deleteConfirm.bomId)
      showSuccess('Đã xóa khỏi BOM')
      await loadData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể xóa')
    } finally {
      setDeleteConfirm({ open: false, bomId: null })
    }
  }

  // Calculate suggested price
  const suggestedPrice = bomItems.reduce((sum, item) => {
    return sum + (Number(item.variant_price || 0) * item.so_luong)
  }, 0)

  // Filter variants that are not already in BOM
  const availableVariants = variants.filter(
    (v) => !bomItems.some((bom) => bom.bienthe_id === parseInt(v.id))
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <MuiButton onClick={() => navigate('/admin/gift-boxes')} sx={{ color: '#473C2F' }}>
          <ArrowBackIcon />
        </MuiButton>
        <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          Quản lý BOM: {giftBox?.ten_hop_qua || 'Hộp quà'}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {/* Left: Variant Selection */}
        <Paper sx={{ p: 3, border: '1px solid #E8E5DD' }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#473C2F' }}>
            Chọn biến thể sản phẩm
          </Typography>

          {/* Filters */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <TextField
              label="Danh mục"
              select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="">Tất cả</MenuItem>
              {Array.from(new Set(variants.map((v) => v.category))).map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Kích thước"
              select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              size="small"
            >
              <MenuItem value="">Tất cả</MenuItem>
              {['S', 'M', 'L', 'XL'].map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Tìm kiếm"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              size="small"
            />
            <Button variant="outline" onClick={loadData} className="w-full">
              Áp dụng bộ lọc
            </Button>
          </Box>

          {/* Variant List */}
          <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
            {availableVariants.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Không có biến thể nào
              </Typography>
            ) : (
              availableVariants.map((variant) => (
                <Paper
                  key={variant.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: '1px solid #E8E5DD',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#FAFAF7' },
                    ...(selectedVariantId === variant.id && { bgcolor: '#FAFAF7', borderColor: '#C59B72' }),
                  }}
                  onClick={() => setSelectedVariantId(variant.id)}
                >
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {variant.name} - {variant.size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {variant.category} • {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(variant.price)}
                  </Typography>
                </Paper>
              ))
            )}
          </Box>

          {/* Add to BOM */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Số lượng"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              size="small"
              inputProps={{ min: 1 }}
              sx={{ width: 100 }}
            />
            <Button variant="primary" onClick={handleAddBomItem} className="flex-1">
              <AddIcon /> Thêm vào BOM
            </Button>
          </Box>
        </Paper>

        {/* Right: Current BOM */}
        <Paper sx={{ p: 3, border: '1px solid #E8E5DD' }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#473C2F' }}>
            BOM hiện tại ({bomItems.length} items)
          </Typography>

          {bomItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Chưa có item nào trong BOM. Hộp quà phải có ít nhất 1 item.
            </Typography>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                {bomItems.map((item) => (
                  <Paper
                    key={item.bom_id}
                    sx={{
                      p: 2,
                      mb: 1,
                      border: '1px solid #E8E5DD',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {item.variant_name || `Biến thể #${item.bienthe_id}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.product_name} • {item.product_category}
                      </Typography>
                      {item.variant_price && (
                        <Typography variant="body2" color="text.secondary">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.variant_price))} × {item.so_luong}
                        </Typography>
                      )}
                      {item.variant_active === false && (
                        <Chip label="Biến thể không hoạt động" color="warning" size="small" sx={{ mt: 0.5 }} />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        type="number"
                        value={item.so_luong}
                        onChange={(e) => handleUpdateQuantity(item.bom_id, parseInt(e.target.value) || 1)}
                        size="small"
                        inputProps={{ min: 1 }}
                        sx={{ width: 80 }}
                      />
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(item.bom_id)}
                        className="text-red-600 hover:text-red-700 min-w-0 p-1"
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>

              {/* Suggested Price */}
              <Paper sx={{ p: 2, bgcolor: '#FAFAF7', border: '1px solid #E8E5DD' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Giá đề xuất (tổng giá biến thể):
                </Typography>
                <Typography variant="h6" sx={{ color: '#C59B72', mb: 2 }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(suggestedPrice)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Giá hộp quà hiện tại: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(giftBox?.gia_ban || 0))}
                </Typography>
              </Paper>
            </>
          )}
        </Paper>
      </Box>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        message="Bạn có chắc chắn muốn xóa item này khỏi BOM?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, bomId: null })}
        variant="danger"
      />
    </Box>
  )
}

