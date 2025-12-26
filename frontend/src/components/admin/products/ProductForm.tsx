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
import { getImageUrl } from '../../../utils/getImageUrl'

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
      // Use getImageUrl to convert relative path to full URL for preview
      const previewUrl = variant.image ? (variant.image.startsWith('http') || variant.image.startsWith('data:') || variant.image.startsWith('blob:') ? variant.image : getImageUrl(variant.image)) : ''
      setImagePreview(previewUrl)
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

    // Show preview immediately
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setImagePreview(base64String)
    }
    reader.readAsDataURL(file)

    // Upload file to server
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('access_token')
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      
      const response = await fetch(`${API_BASE_URL}/products/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token?.trim()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Upload ảnh thất bại')
      }

      const result = await response.json()
      // Update form data with relative path from server
      setFormData((prev) => ({ ...prev, image: result.image_path }))
      
      // Update preview with full URL
      const { getImageUrl } = await import('../../../utils/getImageUrl')
      setImagePreview(getImageUrl(result.image_path))
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(error instanceof Error ? error.message : 'Upload ảnh thất bại')
      setImagePreview('')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      } else if (imagePath.startsWith('http') && !imagePath.includes('/uploads/')) {
        // External URL, keep as is
        imagePath = imagePath
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

  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      transition: 'all 0.2s ease',
      '& fieldset': {
        borderColor: 'rgba(122, 111, 99, 0.2)',
        transition: 'border-color 0.2s ease',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(122, 111, 99, 0.4)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#C59B72',
        borderWidth: '2px',
      },
      '&:hover': {
        backgroundColor: 'rgba(250, 250, 249, 0.5)',
      },
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.9375rem',
      fontWeight: 500,
      '&.Mui-focused': {
        color: '#C59B72',
      },
    },
    '& .MuiFormHelperText-root': {
      fontSize: '0.75rem',
      marginTop: '6px',
      color: '#9B948B',
    },
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F', pb: 1 }}>
          {variant ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <TextField
              label="Tên sản phẩm"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={inputStyles}
            />

            <TextField
              label="Mô tả"
              required
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={inputStyles}
              helperText="Mô tả chi tiết về sản phẩm"
            />

            <FormControl fullWidth required sx={inputStyles}>
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
                <FormControl fullWidth required sx={inputStyles}>
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

              <Box sx={{ flex: 1, minWidth: '200px' }}>
                <TextField
                  label="Giá (VND)"
                  type="number"
                  required
                  fullWidth
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  inputProps={{ min: 0, step: 1000 }}
                  sx={inputStyles}
                  helperText="Giá bán cho khách"
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '200px' }}>
                <FormControl fullWidth required sx={inputStyles}>
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
              <Typography variant="body2" sx={{ mb: 2, color: '#7A6F63', fontWeight: 600, fontSize: '0.9375rem' }}>
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
                sx={{ 
                  mb: 2.5,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    minHeight: '40px',
                    '&.Mui-selected': {
                      color: '#C59B72',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#C59B72',
                  },
                }}
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
                  sx={inputStyles}
                  helperText="Nhập đường dẫn URL hoặc đường dẫn tương đối (product/xxx.jpg)"
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
                    sx={{
                      borderRadius: '12px',
                      borderColor: 'rgba(122, 111, 99, 0.2)',
                      color: '#7A6F63',
                      textTransform: 'none',
                      fontWeight: 500,
                      py: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#C59B72',
                        bgcolor: 'rgba(197, 155, 114, 0.05)',
                        borderWidth: '2px',
                      },
                    }}
                  >
                    Chọn ảnh từ máy
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#9B948B', fontSize: '0.75rem' }}>
                    Kích thước tối đa 5MB, định dạng JPG/PNG/WEBP
                  </Typography>
                </Box>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <Box sx={{ mt: 3, p: 2, bgcolor: '#FAFAF9', borderRadius: '12px', border: '1px solid rgba(122, 111, 99, 0.1)' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: '#7A6F63', fontWeight: 600 }}>
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
        <DialogActions sx={{ p: 3, gap: 1.5, borderTop: '1px solid rgba(122, 111, 99, 0.08)' }}>
          <Button 
            onClick={onClose} 
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              color: '#7A6F63',
              borderRadius: '10px',
              px: 3,
              py: 1,
              '&:hover': {
                bgcolor: 'rgba(122, 111, 99, 0.08)',
              },
            }}
          >
            Hủy
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            sx={{ 
              bgcolor: '#C59B72',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              px: 4,
              py: 1,
              boxShadow: '0 2px 8px rgba(197, 155, 114, 0.25)',
              transition: 'all 0.2s ease',
              '&:hover': { 
                bgcolor: '#B0895F',
                boxShadow: '0 4px 12px rgba(197, 155, 114, 0.35)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:disabled': {
                bgcolor: '#E8E5DD',
                color: '#9B948B',
              },
            }}
          >
            {loading ? 'Đang lưu...' : variant ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

