// Product Form component - create/edit product variant
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Autocomplete,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material'
import { ProductVariant } from '../../../types/admin'
import { getCategories } from '../../../services/admin/categoryService'
import { getImageUrl } from '../../../utils/getImageUrl'
import { useAdminForm, type FieldErrors } from '../../../hooks/admin/useAdminForm'
import { useUnsavedChanges } from '../../../hooks/admin/useUnsavedChanges'
import ProductImageCropper from './ProductImageCropper'

interface ProductFormProps {
  open: boolean
  variant: ProductVariant | null
  sizeOptions?: string[]
  onClose: () => void
  onSubmit: (data: Omit<ProductVariant, 'id'>) => Promise<void>
}

// Helper function to generate SKU
function generateSKU(name: string, size: string): string {
  // Get first 3 letters of product name (uppercase, remove spaces and special chars)
  const nameAbbr = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X') // If less than 3 chars, pad with X
  
  // Get timestamp last 3 digits for unique number
  const number = Date.now().toString().slice(-3)
  
  return `${nameAbbr}-${size}-${number}`
}

export default function ProductForm({ open, variant, sizeOptions = [], onClose, onSubmit }: ProductFormProps) {
  const [formData, setFormData] = useState<Omit<ProductVariant, 'id'>>({
    productId: '',
    name: '',
    flavor: '',
    description: '',
    category: '',
    price: 0,
    size: '',
    sizeLabel: '',
    status: 'active',
    image: '',
    sku: '',
  })
  const [loading, setLoading] = useState(false)
  const [imageInputType, setImageInputType] = useState<'url' | 'file'>('url')
  const [imagePreview, setImagePreview] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const validate = (values: Omit<ProductVariant, 'id'>): FieldErrors => {
    const next: FieldErrors = {}
    if (!values.name.trim()) next.name = 'Tên sản phẩm là bắt buộc'
    if (!values.description.trim()) next.description = 'Mô tả sản phẩm là bắt buộc'
    if (!values.category.trim()) next.category = 'Danh mục là bắt buộc'
    if (values.price <= 0) next.price = 'Giá phải lớn hơn 0'
    const isVariant = !variant || variant.id.startsWith('variant:')
    if (isVariant && !values.flavor.trim()) next.flavor = 'Hương vị là bắt buộc'
    if (isVariant && !values.size.trim()) next.size = 'Kích thước là bắt buộc'
    if (values.size.length > 50) next.size = 'Kích thước tối đa 50 ký tự'
    if (values.flavor.length > 100) next.flavor = 'Hương vị tối đa 100 ký tự'
    return next
  }
  const adminForm = useAdminForm({ initialValues: formData, validate })
  const { validateForm, errors: fieldErrors, setValues } = adminForm
  useEffect(() => { setValues(formData) }, [formData, setValues])
  useUnsavedChanges(open && !loading && Boolean(formData.name || formData.description || formData.image))

  useEffect(() => {
    // Load categories whenever form opens
    if (open) {
      void getCategories().then(setCategories).catch(() => setCategories([]))
    }
  }, [open])

  useEffect(() => {
    if (variant) {
      setFormData({
        productId: variant.productId,
        name: variant.name,
        flavor: variant.flavor,
        description: variant.description,
        category: variant.category,
        price: variant.price,
        size: variant.size,
        sizeLabel: variant.sizeLabel,
        status: variant.status,
        image: variant.image,
        sku: variant.sku || '',
      })
      // Use getImageUrl to convert relative path to full URL for preview
      const previewUrl = variant.image ? (variant.image.startsWith('http') || variant.image.startsWith('data:') || variant.image.startsWith('blob:') ? variant.image : getImageUrl(variant.image)) : ''
      setImagePreview(previewUrl)
      setImageInputType(
        variant.image?.startsWith('data:') ||
        variant.image?.startsWith('blob:') ||
        variant.image?.startsWith('product/thumbnails/')
          ? 'file'
          : 'url',
      )
    } else {
      setFormData({
        productId: '',
        name: '',
        flavor: '',
        description: '',
        category: categories.length > 0 ? categories[0] : '',
        price: 0,
        size: '',
        sizeLabel: '',
        status: 'active',
        image: '',
        sku: '',
      })
      setImagePreview('')
      setImageInputType('url')
    }
  }, [variant, open, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!validateForm()) return
    
    // Convert full URL back to relative path if needed
    let imagePath = formData.image
    if (imagePath) {
      // If it's a full URL from our API, extract relative path
      const urlMatch = imagePath.match(/\/uploads\/(product|giftboxes)\/(.+)$/)
      if (urlMatch) {
        imagePath = `${urlMatch[1]}/${urlMatch[2]}`
      } else if (imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
        // Base64/blob - this shouldn't happen if file was uploaded correctly
        // But if it does, we need to upload it first
        console.warn('Base64 image detected, should have been uploaded already')
        imagePath = '' // Clear it, user needs to upload file again
      }
      // If already relative path (product/xxx.jpg), keep as is
    }
    
    // Auto-generate SKU if not editing or if SKU is empty
    const finalData = {
      ...formData,
      image: imagePath || '',
      sku: variant?.sku || generateSKU(formData.name, formData.size),
    }
    
    setLoading(true)
    try {
      await onSubmit(finalData)
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
        <DialogTitle sx={{ pb: 1 }}>
          {variant ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <TextField
              label="Tên sản phẩm"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
            />

            <TextField
              label="Mô tả"
              required
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              error={Boolean(fieldErrors.description)}
              helperText="Mô tả chi tiết về sản phẩm"
            />

            <TextField
              label="Hương vị"
              required={!variant || variant.id.startsWith('variant:')}
              fullWidth
              value={formData.flavor}
              onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
              error={Boolean(fieldErrors.flavor)}
              helperText={fieldErrors.flavor || 'Tên hương vị của biến thể'}
              inputProps={{ maxLength: 100 }}
            />

            <FormControl fullWidth required>
              <InputLabel>Danh mục</InputLabel>
              <Select
                value={formData.category}
                label="Danh mục"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: '200px' }}>
                <Autocomplete
                  freeSolo
                  options={sizeOptions}
                  value={formData.size}
                  onChange={(_, value) => setFormData({ ...formData, size: value || '' })}
                  onInputChange={(_, value) => setFormData({ ...formData, size: value })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Kích thước"
                      required={!variant || variant.id.startsWith('variant:')}
                      error={Boolean(fieldErrors.size)}
                      helperText={fieldErrors.size || 'Giữ nguyên dạng như 16cm, 8in'}
                      inputProps={{ ...params.inputProps, maxLength: 50 }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '200px' }}>
                <TextField
                  label="Giá (VND)"
                  type="number"
                  required
                  fullWidth
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  inputProps={{ min: 0, step: 1000 }}
                  helperText="Giá bán cho khách"
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '200px' }}>
                <FormControl fullWidth required>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={formData.status}
                    label="Trạng thái"
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ProductVariant['status'] })
                    }
                  >
                    <MenuItem value="active">Hoạt động</MenuItem>
                    <MenuItem value="hidden">Ẩn</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Image Input Section */}
            <Box>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
                Hình ảnh sản phẩm
              </Typography>
              <Tabs
                value={imageInputType}
                onChange={(_, newValue) => setImageInputType(newValue)}
                sx={{ mb: 2.5 }}
              >
                <Tab label="Nhập URL" value="url" />
                <Tab label="Chọn file" value="file" />
              </Tabs>

              {imageInputType === 'url' ? (
                <TextField
                  label="URL hình ảnh"
                  fullWidth
                  value={formData.image}
                  onChange={(e) => {
                    const url = e.target.value
                    setFormData({ ...formData, image: url })
                    // If it's a relative path, convert to full URL for preview
                    const previewUrl = url ? (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:') ? url : getImageUrl(url)) : ''
                    setImagePreview(previewUrl)
                  }}
                  placeholder="https://example.com/image.jpg"
                  helperText="Nhập đường dẫn URL hoặc đường dẫn tương đối (product/xxx.jpg)"
                />
              ) : (
                <ProductImageCropper
                  currentImagePath={formData.image}
                  disabled={loading}
                  onBusyChange={setLoading}
                  onUploaded={(result) => {
                    setFormData((previous) => ({ ...previous, image: result.image_path }))
                    setImagePreview(`${getImageUrl(result.image_path)}?v=${Date.now()}`)
                    setFormError(null)
                  }}
                />
              )}

              {/* Image Preview */}
              {imagePreview && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary', fontWeight: 600 }}>
                    Xem trước
                  </Typography>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                    }}
                    onError={() => setImagePreview('')}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={onClose} disabled={loading} sx={{ px: 3 }}>
            Hủy
          </Button>
          <Button type="submit" variant="contained" disabled={loading} sx={{ px: 4 }}>
            {loading ? 'Đang lưu...' : variant ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

