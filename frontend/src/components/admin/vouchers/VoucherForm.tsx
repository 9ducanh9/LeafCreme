// Voucher Form component - create/edit voucher
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  Autocomplete,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/vi'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { Voucher } from '../../../types/admin'
import { getProducts } from '../../../services/productService'
import { Product } from '../../../types/product'

// Configure dayjs
dayjs.extend(customParseFormat)
dayjs.locale('vi')

interface VoucherFormProps {
  open: boolean
  voucher: Voucher | null
  onClose: () => void
  onSubmit: (data: Omit<Voucher, 'id'>) => Promise<void>
}

export default function VoucherForm({ open, voucher, onClose, onSubmit }: VoucherFormProps) {
  const [formData, setFormData] = useState<Omit<Voucher, 'id'>>({
    code: '',
    type: 'percent',
    discountValue: 0,
    appliesTo: 'all',
    targetId: '',
    minOrderValue: 0,
    usageLimit: 0,
    expiresAt: '',
    status: 'active',
  })
  const [expiresAtDate, setExpiresAtDate] = useState<Dayjs | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  // Available categories
  const categories = ['Bánh kem', 'Bông lan', 'Mousse', 'Tiramisu']

  const loadProducts = async () => {
    if (loadingProducts || products.length > 0) return // Already loading or loaded
    setLoadingProducts(true)
    try {
      const data = await getProducts({ dang_hoat_dong: true })
      setProducts(data)
      return data
    } catch (error) {
      console.error('Failed to load products:', error)
      return []
    } finally {
      setLoadingProducts(false)
    }
  }

  // Load products when form opens and appliesTo is 'product'
  useEffect(() => {
    if (open && formData.appliesTo === 'product' && products.length === 0) {
      loadProducts()
    }
  }, [open, formData.appliesTo])


  // Load selected product when editing
  useEffect(() => {
    if (voucher) {
      const expiresDate = voucher.expiresAt ? dayjs(voucher.expiresAt) : null
      setExpiresAtDate(expiresDate)
      setFormData({
        code: voucher.code,
        type: voucher.type,
        discountValue: voucher.discountValue,
        appliesTo: voucher.appliesTo,
        targetId: voucher.targetId || '',
        minOrderValue: voucher.minOrderValue || 0,
        usageLimit: voucher.usageLimit || 0,
        expiresAt: voucher.expiresAt,
        status: voucher.status,
      })
      
      // If editing and applies to product, load and select the product
      if (voucher.appliesTo === 'product' && voucher.targetId) {
        loadProducts().then((loadedProducts) => {
          const product = loadedProducts.find(p => p.sanpham_id.toString() === voucher.targetId)
          if (product) setSelectedProduct(product)
        })
      } else {
        setSelectedProduct(null)
      }
    } else {
      // Set default expiry to 30 days from now
      const defaultExpiry = dayjs().add(30, 'day').hour(23).minute(59).second(59)
      setExpiresAtDate(defaultExpiry)
      setFormData({
        code: '',
        type: 'percent',
        discountValue: 0,
        appliesTo: 'all',
        targetId: '',
        minOrderValue: 0,
        usageLimit: 0,
        expiresAt: defaultExpiry.toISOString(),
        status: 'active',
      })
      setSelectedProduct(null)
    }
    setErrors({})
  }, [voucher, open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) {
      newErrors.code = 'Mã giảm giá là bắt buộc'
    }

    if (formData.discountValue <= 0) {
      newErrors.discountValue = 'Giá trị giảm giá phải lớn hơn 0'
    }

    if (formData.type === 'percent' && formData.discountValue > 100) {
      newErrors.discountValue = 'Giảm giá phần trăm không được vượt quá 100%'
    }

    if (formData.appliesTo !== 'all' && !formData.targetId) {
      newErrors.targetId = 'Cần chọn đối tượng áp dụng khi không áp dụng cho tất cả sản phẩm'
    }

    if (formData.minOrderValue < 0) {
      newErrors.minOrderValue = 'Giá trị đơn hàng tối thiểu không được âm'
    }

    if (formData.usageLimit < 0) {
      newErrors.usageLimit = 'Giới hạn sử dụng không được âm'
    }

    if (!expiresAtDate || !expiresAtDate.isValid()) {
      newErrors.expiresAt = 'Ngày hết hạn là bắt buộc'
    } else {
      if (expiresAtDate.isBefore(dayjs())) {
        newErrors.expiresAt = 'Ngày hết hạn phải trong tương lai'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      // Convert dayjs date to ISO string
      const submitData = {
        ...formData,
        expiresAt: expiresAtDate ? expiresAtDate.toISOString() : '',
      }
      await onSubmit(submitData)
      onClose()
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          {voucher ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Mã giảm giá"
              required
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={!!errors.code}
              helperText={errors.code}
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Loại</InputLabel>
                <Select
                  value={formData.type}
                  label="Loại"
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as Voucher['type'] })
                  }
                >
                  <MenuItem value="percent">Phần trăm</MenuItem>
                  <MenuItem value="fixed_amount">Số tiền cố định</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label={formData.type === 'percent' ? 'Giảm giá (%)' : 'Giảm giá (VND)'}
                type="number"
                required
                fullWidth
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({ ...formData, discountValue: Number(e.target.value) })
                }
                error={!!errors.discountValue}
                helperText={errors.discountValue}
                inputProps={{ min: 0, max: formData.type === 'percent' ? 100 : undefined }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Áp dụng cho</InputLabel>
                <Select
                  value={formData.appliesTo}
                  label="Áp dụng cho"
                  onChange={(e) => {
                    const newAppliesTo = e.target.value as Voucher['appliesTo']
                    setFormData({ 
                      ...formData, 
                      appliesTo: newAppliesTo,
                      targetId: '', // Reset target when changing appliesTo
                    })
                    setSelectedProduct(null) // Reset selected product
                    if (newAppliesTo === 'product') {
                      loadProducts()
                    }
                  }}
                >
                  <MenuItem value="all">Tất cả sản phẩm</MenuItem>
                  <MenuItem value="category">Danh mục</MenuItem>
                  <MenuItem value="product">Sản phẩm</MenuItem>
                </Select>
              </FormControl>

              {formData.appliesTo === 'category' && (
                <FormControl fullWidth required>
                  <InputLabel>Danh mục</InputLabel>
                  <Select
                    value={formData.targetId}
                    label="Danh mục"
                    onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    error={!!errors.targetId}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.targetId && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {errors.targetId}
                    </Typography>
                  )}
                </FormControl>
              )}

              {formData.appliesTo === 'product' && (
                <Autocomplete
                  fullWidth
                  options={products}
                  getOptionLabel={(option) => `${option.ten} (ID: ${option.sanpham_id})`}
                  loading={loadingProducts}
                  value={selectedProduct}
                  onChange={(_, newValue) => {
                    setSelectedProduct(newValue)
                    setFormData({ 
                      ...formData, 
                      targetId: newValue ? newValue.sanpham_id.toString() : '' 
                    })
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Chọn sản phẩm"
                      error={!!errors.targetId}
                      helperText={errors.targetId || 'Tìm kiếm và chọn một sản phẩm'}
                    />
                  )}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Giá trị đơn hàng tối thiểu (VND)"
                type="number"
                fullWidth
                value={formData.minOrderValue || ''}
                onChange={(e) =>
                  setFormData({ ...formData, minOrderValue: Number(e.target.value) || 0 })
                }
                error={!!errors.minOrderValue}
                helperText={errors.minOrderValue || 'Để 0 nếu không có tối thiểu'}
                inputProps={{ min: 0 }}
              />

              <TextField
                label="Giới hạn sử dụng"
                type="number"
                fullWidth
                value={formData.usageLimit || ''}
                onChange={(e) =>
                  setFormData({ ...formData, usageLimit: Number(e.target.value) || 0 })
                }
                error={!!errors.usageLimit}
                helperText={errors.usageLimit || 'Để 0 nếu không giới hạn'}
                inputProps={{ min: 0 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
                <DateTimePicker
                  label="Hết hạn"
                  value={expiresAtDate}
                  onChange={(newValue) => {
                    setExpiresAtDate(newValue)
                    if (newValue) {
                      setFormData({ ...formData, expiresAt: newValue.toISOString() })
                    }
                  }}
                  format="DD/MM/YYYY HH:mm"
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      error: !!errors.expiresAt,
                      helperText: errors.expiresAt || 'Format: DD/MM/YYYY HH:MM',
                    },
                  }}
                />
              </LocalizationProvider>

              <FormControl fullWidth required>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={formData.status}
                  label="Trạng thái"
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as Voucher['status'] })
                  }
                >
                  <MenuItem value="active">Hoạt động</MenuItem>
                  <MenuItem value="inactive">Không hoạt động</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {formData.type === 'percent' && formData.discountValue > 50 && (
              <Alert severity="warning">
                Giảm giá phần trăm cao ({formData.discountValue}%). Vui lòng xem xét cẩn thận.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" variant="contained" disabled={loading} sx={{ bgcolor: '#C59B72' }}>
            {loading ? 'Đang lưu...' : voucher ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

