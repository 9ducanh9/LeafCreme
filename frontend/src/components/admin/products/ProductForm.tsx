// Product Form component - create/edit product variant
import { useState, useEffect, useRef } from 'react'
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
  Tabs,
  Tab,
} from '@mui/material'
import { ProductVariant } from '../../../types/admin'
import { getCategories } from '../../../services/admin/categoryService'

interface ProductFormProps {
  open: boolean
  variant: ProductVariant | null
  onClose: () => void
  onSubmit: (data: Omit<ProductVariant, 'id'>) => Promise<void>
}

const SIZES: ProductVariant['size'][] = ['S', 'M', 'L', 'XL']

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

export default function ProductForm({ open, variant, onClose, onSubmit }: ProductFormProps) {
  const [formData, setFormData] = useState<Omit<ProductVariant, 'id'>>({
    productId: '',
    name: '',
    description: '',
    category: '',
    price: 0,
    size: 'M',
    status: 'active',
    image: '',
    sku: '',
  })
  const [loading, setLoading] = useState(false)
  const [imageInputType, setImageInputType] = useState<'url' | 'file'>('url')
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    // Load categories whenever form opens
    if (open) {
      const cats = getCategories()
      setCategories(cats)
    }
  }, [open])

  useEffect(() => {
    if (variant) {
      setFormData({
        productId: variant.productId,
        name: variant.name,
        description: variant.description,
        category: variant.category,
        price: variant.price,
        size: variant.size,
        status: variant.status,
        image: variant.image,
        sku: variant.sku || '',
      })
      setImagePreview(variant.image || '')
      setImageInputType(variant.image?.startsWith('data:') || variant.image?.startsWith('blob:') ? 'file' : 'url')
    } else {
      setFormData({
        productId: '',
        name: '',
        description: '',
        category: categories.length > 0 ? categories[0] : '',
        price: 0,
        size: 'M',
        status: 'active',
        image: '',
        sku: '',
      })
      setImagePreview('')
      setImageInputType('url')
    }
  }, [variant, open, categories])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File ảnh không được vượt quá 5MB')
        return
      }

      // Convert to base64 for preview and storage
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setFormData({ ...formData, image: base64String })
        setImagePreview(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Auto-generate SKU if not editing or if SKU is empty
    const finalData = {
      ...formData,
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
        <DialogTitle sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F' }}>
          {variant ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Tên sản phẩm"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <TextField
              label="Mô tả"
              required
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Kích thước</InputLabel>
                <Select
                  value={formData.size}
                  label="Kích thước"
                  onChange={(e) =>
                    setFormData({ ...formData, size: e.target.value as ProductVariant['size'] })
                  }
                >
                  {SIZES.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Giá (VND)"
                type="number"
                required
                fullWidth
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />

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

            {/* Image Input Section */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: '#7A6F63' }}>
                Hình ảnh sản phẩm
              </Typography>
              <Tabs
                value={imageInputType}
                onChange={(_, newValue) => {
                  setImageInputType(newValue)
                  if (newValue === 'url') {
                    setFormData({ ...formData, image: '' })
                    setImagePreview('')
                  } else {
                    setFormData({ ...formData, image: '' })
                    setImagePreview('')
                  }
                }}
                sx={{ mb: 2 }}
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
                    setFormData({ ...formData, image: e.target.value })
                    setImagePreview(e.target.value)
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              ) : (
                <Box>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Chọn ảnh từ máy
                  </Button>
                </Box>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <Box sx={{ mt: 2 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #E8E5DD',
                    }}
                    onError={() => setImagePreview('')}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" variant="contained" disabled={loading} sx={{ bgcolor: '#C59B72' }}>
            {loading ? 'Đang lưu...' : variant ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

