import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Slider, Typography } from '@mui/material'
import Cropper, { type Area } from 'react-easy-crop'
import { getImageUrl } from '../../../utils/getImageUrl'

const ASPECT_RATIO = 4 / 3
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface ProductImageUploadResult {
  image_path: string
  thumbnail_path: string
  original_path: string
  message: string
}

interface ProductImageCropperProps {
  currentImagePath?: string
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
  onUploaded: (result: ProductImageUploadResult) => void
}

function originalPathFor(imagePath?: string): string | null {
  if (!imagePath) return null
  const match = imagePath.match(/^product\/thumbnails\/([a-f0-9]+)_thumb\.jpg$/i)
  return match ? `product/originals/${match[1]}.jpg` : null
}

export default function ProductImageCropper({
  currentImagePath,
  disabled = false,
  onBusyChange,
  onUploaded,
}: ProductImageCropperProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [existingOriginalPath, setExistingOriginalPath] = useState<string | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const resetCropper = useCallback(() => {
    releaseObjectUrl()
    setFile(null)
    setExistingOriginalPath(null)
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [releaseObjectUrl])

  useEffect(() => () => releaseObjectUrl(), [releaseObjectUrl])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!ALLOWED_IMAGE_TYPES.has(selectedFile.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP')
      event.target.value = ''
      return
    }
    if (selectedFile.size > MAX_IMAGE_BYTES) {
      // Nêu số cụ thể — "quá 5MB" không cho người dùng biết phải nén
      // xuống bao nhiêu (spec 11 §2.2).
      const mb = (selectedFile.size / 1024 / 1024).toLocaleString('vi', { maximumFractionDigits: 1 })
      setError(`Ảnh ${mb} MB — tối đa 5 MB.`)
      event.target.value = ''
      return
    }

    releaseObjectUrl()
    const objectUrl = URL.createObjectURL(selectedFile)
    objectUrlRef.current = objectUrl
    setFile(selectedFile)
    setExistingOriginalPath(null)
    setImageSrc(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError(null)
  }

  const handleStartRecrop = () => {
    const originalPath = originalPathFor(currentImagePath)
    if (!originalPath) return
    releaseObjectUrl()
    setFile(null)
    setExistingOriginalPath(originalPath)
    setImageSrc(getImageUrl(originalPath))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError(null)
  }

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleSave = async () => {
    if ((!file && !existingOriginalPath) || !croppedAreaPixels) return

    setSaving(true)
    onBusyChange?.(true)
    setError(null)
    try {
      const payload = new FormData()
      payload.append('crop', JSON.stringify({
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
      }))

      let endpoint = '/products/upload-image'
      if (file) {
        payload.append('file', file)
      } else if (existingOriginalPath) {
        endpoint = '/products/recrop-image'
        payload.append('original_path', existingOriginalPath)
      }

      const token = localStorage.getItem('access_token')?.trim()
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: payload,
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(body?.detail || `Upload ảnh thất bại (${response.status})`)
      }

      onUploaded(body as ProductImageUploadResult)
      resetCropper()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload ảnh thất bại')
    } finally {
      setSaving(false)
      onBusyChange?.(false)
    }
  }

  const canRecrop = Boolean(originalPathFor(currentImagePath))

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!imageSrc ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            sx={{ flex: 1, minWidth: 180, py: 1.5 }}
          >
            Chọn ảnh từ máy
          </Button>
          {canRecrop ? (
            <Button variant="text" onClick={handleStartRecrop} disabled={disabled}>
              Chỉnh lại khung ảnh
            </Button>
          ) : null}
        </Box>
      ) : (
        <Box>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: 280, sm: 360 },
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: '#171717',
            }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={ASPECT_RATIO}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              restrictPosition
              showGrid
            />
          </Box>

          <Typography id="product-image-zoom-label" variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
            Thu phóng
          </Typography>
          <Slider
            aria-labelledby="product-image-zoom-label"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(_, value) => setZoom(value as number)}
            disabled={saving}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
            <Button type="button" onClick={resetCropper} disabled={saving}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={handleSave}
              disabled={saving || !croppedAreaPixels}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? 'Đang lưu…' : 'Lưu khung ảnh'}
            </Button>
          </Box>
        </Box>
      )}

      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
        JPG, PNG hoặc WEBP, tối đa 5MB. Kéo ảnh và thu phóng để chọn khung 4:3.
      </Typography>
      {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
    </Box>
  )
}
