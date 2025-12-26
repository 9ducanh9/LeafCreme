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
      setGiftBoxes(data)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      showError(message || 'Không thể tải danh sách hộp quà')
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
          sx={{ bgcolor: '#C59B72', '&:hover': { bgcolor: '#B0895F' } }}
        >
          Tạo hộp quà
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid #E8E5DD' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Tìm kiếm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            select
            label="Trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
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
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #E8E5DD' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAFAF7' }}>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Tên hộp quà</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Giá bán</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#473C2F' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {giftBoxes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#7A6F63' }}>
                    Không có hộp quà nào
                  </TableCell>
                </TableRow>
              ) : (
                giftBoxes.map((gb) => (
                  <TableRow key={gb.hop_qua_id} hover>
                    <TableCell>{gb.hop_qua_id}</TableCell>
                    <TableCell>{gb.ten_hop_qua}</TableCell>
                    <TableCell>{gb.sku || '-'}</TableCell>
                    <TableCell>{formatPrice(Number(gb.gia_ban))}</TableCell>
                    <TableCell>
                      <Chip
                        label={gb.dang_hoat_dong ? 'Hoạt động' : 'Không hoạt động'}
                        color={gb.dang_hoat_dong ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/admin/gift-boxes/${gb.hop_qua_id}/bom`)}
                          sx={{ color: '#C59B72' }}
                          title="Quản lý BOM"
                        >
                          <InventoryIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(gb)}
                          sx={{ color: '#C59B72' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(gb.hop_qua_id)}
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
      )}

      {/* Form Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingGiftBox(null)
        }}
        title={editingGiftBox ? 'Chỉnh sửa hộp quà' : 'Tạo hộp quà mới'}
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="outlined"
              onClick={() => {
                setFormOpen(false)
                setEditingGiftBox(null)
              }}
            >
              Hủy
            </Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingGiftBox ? 'Cập nhật' : 'Tạo'}
            </Button>
          </div>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Tên hộp quà *"
            value={formData.ten_hop_qua}
            onChange={(e) => setFormData({ ...formData, ten_hop_qua: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            fullWidth
          />
          <TextField
            label="Giá bán *"
            type="number"
            value={formData.gia_ban}
            onChange={(e) => setFormData({ ...formData, gia_ban: Number(e.target.value) })}
            fullWidth
            required
            inputProps={{ min: 0, step: 1000 }}
          />
          <TextField
            label="Mô tả"
            value={formData.mo_ta}
            onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
          <TextField
            label="URL hình ảnh"
            value={formData.hinh_anh_url}
            onChange={(e) => setFormData({ ...formData, hinh_anh_url: e.target.value })}
            fullWidth
            placeholder="product/xxx.jpg hoặc giftboxes/xxx.jpg hoặc URL đầy đủ"
            helperText="Có thể nhập đường dẫn tương đối (product/xxx.jpg) hoặc URL đầy đủ"
          />
          {/* Image Preview */}
          {formData.hinh_anh_url && (
            <Box sx={{ mt: 1 }}>
              <img
                src={getImageUrl(formData.hinh_anh_url)}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid #E8E5DD',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </Box>
          )}
          <TextField
            label="Kích thước"
            value={formData.kich_thuoc}
            onChange={(e) => setFormData({ ...formData, kich_thuoc: e.target.value })}
            fullWidth
          />
          <TextField
            label="Trọng lượng (kg)"
            type="number"
            value={formData.trong_luong || ''}
            onChange={(e) => setFormData({ ...formData, trong_luong: e.target.value ? Number(e.target.value) : undefined })}
            fullWidth
            inputProps={{ min: 0, step: 0.1 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              type="checkbox"
              id="dang_hoat_dong"
              checked={formData.dang_hoat_dong}
              onChange={(e) => setFormData({ ...formData, dang_hoat_dong: e.target.checked })}
            />
            <label htmlFor="dang_hoat_dong">Đang hoạt động</label>
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

