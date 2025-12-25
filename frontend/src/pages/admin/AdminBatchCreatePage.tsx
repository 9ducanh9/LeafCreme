import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  Alert,
  InputAdornment,
} from '@mui/material'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import SearchIcon from '@mui/icons-material/Search'

import { getProductVariants } from '../../services/admin/productService'
import { getGiftBoxes } from '../../services/admin/giftBoxService'
import { getSuppliers } from '../../services/admin/supplierService'
import { getComponents } from '../../services/admin/componentService'
import {
  createProductBatch,
  createComponentBatch,
  createGiftBoxBatch,
} from '../../services/admin/batchService'
import { scanLookup } from '../../services/lookupService'
import { useToast } from '../../contexts/ToastContext'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} id={`batch-tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export default function AdminBatchCreatePage() {
  const { showSuccess, showError } = useToast()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [suppliers, setSuppliers] = useState<{ ncc_id: number; ten_ncc: string }[]>([])
  const [variants, setVariants] = useState<
    { id: string; name: string; sku: string; price: number; productId: string }[]
  >([])
  const [components, setComponents] = useState<{ linh_kien_id: number; ten_linh_kien: string; sku?: string | null }[]>([])
  const [giftBoxes, setGiftBoxes] = useState<{ hop_qua_id: number; ten_hop_qua: string; sku: string | null; gia_ban: number }[]>([])

  const [scanText, setScanText] = useState('')

  const [common, setCommon] = useState({
    ncc_id: '' as string,
    ma_lo: '',
    ma_qr: '',
    ngay_het_han: '',
    so_luong: 1,
    gia_don_vi: 0,
    ghi_chu: '',
  })

  const [selectedVariantId, setSelectedVariantId] = useState<number | ''>('')
  const [selectedComponentId, setSelectedComponentId] = useState<number | ''>('')
  const [selectedGiftBoxId, setSelectedGiftBoxId] = useState<number | ''>('')

  const canSubmit = useMemo(() => {
    if (!common.ma_lo.trim()) return false
    if (!common.ngay_het_han) return false
    if (!common.so_luong || common.so_luong <= 0) return false
    if (!common.gia_don_vi || common.gia_don_vi <= 0) return false
    if (activeTab === 0) return selectedVariantId !== ''
    if (activeTab === 1) return selectedComponentId !== ''
    if (activeTab === 2) return selectedGiftBoxId !== ''
    return false
  }, [activeTab, common, selectedVariantId, selectedComponentId, selectedGiftBoxId])

  useEffect(() => {
    ;(async () => {
      try {
        const [supplierData, variantData, componentData, giftBoxData] = await Promise.all([
          getSuppliers({ dang_hoat_dong: true }),
          getProductVariants(),
          getComponents({ dang_hoat_dong: true }),
          getGiftBoxes({ dang_hoat_dong: true }),
        ])

        setSuppliers(supplierData.map((s) => ({ ncc_id: s.ncc_id, ten_ncc: s.ten_ncc })))

        setVariants(
          variantData
            .filter((v) => v.status === 'active')
            .map((v) => ({
              id: v.id,
              productId: v.productId,
              name: v.name,
              sku: v.sku || '',
              price: v.price,
            }))
        )

        setComponents(componentData.map((c) => ({ linh_kien_id: c.linh_kien_id, ten_linh_kien: c.ten_linh_kien, sku: c.sku })))
        setGiftBoxes(giftBoxData.map((g) => ({ hop_qua_id: g.hop_qua_id, ten_hop_qua: g.ten_hop_qua, sku: g.sku, gia_ban: g.gia_ban })))
      } catch (e) {
        setError('Không thể tải dữ liệu danh mục cho nhập lô')
      }
    })()
  }, [])

  const handleScanSubmit = async () => {
    const code = scanText.trim()
    if (!code) return
    setLoading(true)
    setError(null)
    try {
      const res = await scanLookup(code)
      if (res.type === 'product_batch' || res.type === 'component_batch' || res.type === 'giftbox_batch') {
        setCommon((prev) => ({
          ...prev,
          ma_qr: res.ma_qr || prev.ma_qr,
          ma_lo: res.ma_lo || prev.ma_lo,
        }))
        showSuccess('Đã điền mã lô / mã QR từ scan')
        return
      }
      if (res.type === 'variant') {
        setActiveTab(0)
        setSelectedVariantId(res.variant_id ? Number(res.variant_id) : '')
        setCommon((prev) => ({
          ...prev,
          gia_don_vi: res.price ? Number(res.price) : prev.gia_don_vi,
        }))
        showSuccess('Đã chọn biến thể từ scan')
        return
      }
      if (res.type === 'product') {
        setError('Mã này là SKU sản phẩm (không phải SKU biến thể). Hãy scan SKU biến thể (sku_bienthe) để nhập lô.')
        return
      }
      setError('Mã scan không hỗ trợ cho màn nhập lô')
    } catch (e: unknown) {
      const detail = e && typeof e === 'object' && 'detail' in e ? (e as { detail?: unknown }).detail : undefined
      setError(typeof detail === 'string' ? detail : 'Không tìm thấy dữ liệu cho mã scan')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCommon({
      ncc_id: '',
      ma_lo: '',
      ma_qr: '',
      ngay_het_han: '',
      so_luong: 1,
      gia_don_vi: 0,
      ghi_chu: '',
    })
    setScanText('')
    setSelectedVariantId('')
    setSelectedComponentId('')
    setSelectedGiftBoxId('')
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    try {
      const payloadCommon = {
        ncc_id: common.ncc_id ? Number(common.ncc_id) : null,
        ma_lo: common.ma_lo.trim(),
        ma_qr: common.ma_qr.trim() || null,
        ngay_het_han: new Date(common.ngay_het_han).toISOString(),
        so_luong: Number(common.so_luong),
        gia_don_vi: Number(common.gia_don_vi),
        ghi_chu: common.ghi_chu.trim() || null,
        trang_thai: 'hoatdong' as const,
      }

      if (activeTab === 0) {
        await createProductBatch({
          ...payloadCommon,
          bienthe_sanpham_id: Number(selectedVariantId),
        })
        showSuccess('Tạo lô hàng sản phẩm thành công')
      }

      if (activeTab === 1) {
        await createComponentBatch({
          ...payloadCommon,
          linh_kien_id: Number(selectedComponentId),
        })
        showSuccess('Tạo lô hàng linh kiện thành công')
      }

      if (activeTab === 2) {
        await createGiftBoxBatch({
          ...payloadCommon,
          hop_qua_id: Number(selectedGiftBoxId),
        })
        showSuccess('Tạo lô hàng hộp quà thành công')
      }

      resetForm()
    } catch (e: unknown) {
      const detail = e && typeof e === 'object' && 'detail' in e ? (e as { detail?: unknown }).detail : undefined
      const msg = typeof detail === 'string' ? detail : 'Không thể tạo lô hàng'
      setError(msg)
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F', mb: 3 }}>
        Nhập lô (thủ công / scan)
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontFamily: 'Playfair Display, serif', fontSize: '1rem' },
          }}
        >
          <Tab label="Sản phẩm" />
          <Tab label="Linh kiện" />
          <Tab label="Hộp quà" />
        </Tabs>

        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Scan mã (VAR:SKU hoặc BATCH:QR/ma_lo) rồi Enter"
            value={scanText}
            onChange={(e) => setScanText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleScanSubmit()
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <QrCodeScannerIcon sx={{ color: '#7A6F63' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SearchIcon />}
                    onClick={handleScanSubmit}
                    disabled={loading}
                  >
                    Tra
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: 320, maxWidth: 560 }}
          />

          <TextField
            size="small"
            select
            label="Nhà cung cấp"
            value={common.ncc_id}
            onChange={(e) => setCommon((p) => ({ ...p, ncc_id: e.target.value }))}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">(Không chọn)</MenuItem>
            {suppliers.map((s) => (
              <MenuItem key={s.ncc_id} value={String(s.ncc_id)}>
                {s.ten_ncc}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <TabPanel value={activeTab} index={0}>
          <TextField
            select
            label="Biến thể sản phẩm *"
            value={selectedVariantId}
            onChange={(e) => {
              const v = e.target.value
              setSelectedVariantId(v === '' ? '' : Number(v))
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">Chọn biến thể</MenuItem>
            {variants.map((v) => (
              <MenuItem key={v.id} value={Number(v.id)}>
                {v.name} ({v.sku})
              </MenuItem>
            ))}
          </TextField>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <TextField
            select
            label="Linh kiện *"
            value={selectedComponentId}
            onChange={(e) => {
              const v = e.target.value
              setSelectedComponentId(v === '' ? '' : Number(v))
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">Chọn linh kiện</MenuItem>
            {components.map((c) => (
              <MenuItem key={c.linh_kien_id} value={c.linh_kien_id}>
                {c.ten_linh_kien} {c.sku ? `(${c.sku})` : ''}
              </MenuItem>
            ))}
          </TextField>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <TextField
            select
            label="Hộp quà *"
            value={selectedGiftBoxId}
            onChange={(e) => {
              const v = e.target.value
              setSelectedGiftBoxId(v === '' ? '' : Number(v))
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="">Chọn hộp quà</MenuItem>
            {giftBoxes.map((g) => (
              <MenuItem key={g.hop_qua_id} value={g.hop_qua_id}>
                {g.ten_hop_qua} {g.sku ? `(${g.sku})` : ''}
              </MenuItem>
            ))}
          </TextField>
        </TabPanel>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
          <TextField
            label="Mã lô *"
            value={common.ma_lo}
            onChange={(e) => setCommon((p) => ({ ...p, ma_lo: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Mã QR"
            value={common.ma_qr}
            onChange={(e) => setCommon((p) => ({ ...p, ma_qr: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Ngày hết hạn *"
            type="datetime-local"
            value={common.ngay_het_han}
            onChange={(e) => setCommon((p) => ({ ...p, ngay_het_han: e.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Số lượng *"
            type="number"
            value={common.so_luong}
            onChange={(e) => setCommon((p) => ({ ...p, so_luong: Number(e.target.value) }))}
            fullWidth
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Giá đơn vị *"
            type="number"
            value={common.gia_don_vi}
            onChange={(e) => setCommon((p) => ({ ...p, gia_don_vi: Number(e.target.value) }))}
            fullWidth
            inputProps={{ min: 0, step: 1000 }}
          />
          <TextField
            label="Ghi chú"
            value={common.ghi_chu}
            onChange={(e) => setCommon((p) => ({ ...p, ghi_chu: e.target.value }))}
            fullWidth
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={resetForm} disabled={loading}>
            Reset
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || loading}>
            Tạo lô
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
