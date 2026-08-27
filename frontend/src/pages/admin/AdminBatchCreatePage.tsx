import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  AlertTitle,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PriceCheckOutlinedIcon from '@mui/icons-material/PriceCheckOutlined'
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined'
import AdminPage from '../../components/admin/ui/admin-page'
import { useUnsavedChanges } from '../../hooks/admin/useUnsavedChanges'
import { validateBatch, validateBatchSoft } from '../../utils/admin/validateBatch'
import { getProductVariants } from '../../services/admin/productService'
import { getGiftBoxes } from '../../services/admin/giftBoxService'
import { getSuppliers } from '../../services/admin/supplierService'
import { getComponents } from '../../services/admin/componentService'
import { createProductBatch, createComponentBatch, createGiftBoxBatch, suggestBatchCode, type BatchCodeKind } from '../../services/admin/batchService'
import { useToast } from '../../contexts/ToastContext'
import { parseAdminEntityId, type ProductVariant } from '../../types/admin'
import type { BackendGiftBox } from '../../types/giftBox'
import { formatPrice } from '../../utils/formatPrice'

type BatchKind = 'product' | 'component' | 'giftbox'

type ReceiveOption = {
  id: string
  label: string
  detail: string
  sku?: string | null
  price: number
  shelfLifeDays: number | null
}

const emptyValues = {
  ncc_id: '',
  ma_lo: '',
  ngay_san_xuat: '',
  ngay_het_han: '',
  so_luong: 1,
  gia_don_vi: 0,
  ghi_chu: '',
}

const kindMeta: Record<BatchKind, { label: string; itemLabel: string; description: string }> = {
  product: {
    label: 'Sản phẩm',
    itemLabel: 'Sản phẩm và kích thước',
    description: 'Nhập thành phẩm theo đúng biến thể và kích thước bán ra.',
  },
  component: {
    label: 'Linh kiện',
    itemLabel: 'Linh kiện',
    description: 'Nhập nguyên liệu, bao bì hoặc linh kiện để phục vụ sản xuất.',
  },
  giftbox: {
    label: 'Hộp quà',
    itemLabel: 'Mẫu hộp quà',
    description: 'Nhập hàng cho từng mẫu hộp quà đang kinh doanh.',
  },
}

function todayValue(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00`)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value: string): string {
  if (!value) return 'Chưa chọn'
  return new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))
}

function fallbackLotCode(sku: string | null | undefined, dateValue: string): string {
  const prefix = (sku || 'LOT').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'LOT'
  const datePart = dateValue.replace(/-/g, '').slice(2)
  return `${prefix}-${datePart}-01`
}

export default function AdminBatchCreatePage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const [searchParams] = useSearchParams()
  const requestedVariant = searchParams.get('variant')
  const { showSuccess, showError } = useToast()
  const [kind, setKind] = useState<BatchKind>('product')
  const [values, setValues] = useState(emptyValues)
  const [selectedId, setSelectedId] = useState('')
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof getSuppliers>>>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [components, setComponents] = useState<Awaited<ReturnType<typeof getComponents>>>([])
  const [giftBoxes, setGiftBoxes] = useState<BackendGiftBox[]>([])
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [ackWarnings, setAckWarnings] = useState(false)
  const [manualExpiry, setManualExpiry] = useState(false)
  const [lotCodeManuallyEdited, setLotCodeManuallyEdited] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loadCatalog = useCallback(async () => {
    setCatalogState('loading')
    try {
      const [nextSuppliers, nextVariantPage, nextComponents, nextGiftBoxPage] = await Promise.all([
        getSuppliers({ dang_hoat_dong: true }),
        getProductVariants({ limit: 200 }),
        getComponents({ dang_hoat_dong: true }),
        getGiftBoxes({ dang_hoat_dong: true }),
      ])
      setSuppliers(nextSuppliers)
      setVariants(nextVariantPage.items)
      setComponents(nextComponents)
      setGiftBoxes(nextGiftBoxPage.items)
      setCatalogState('ready')
    } catch {
      setCatalogState('error')
      setError('Không thể tải danh mục. Kiểm tra kết nối rồi thử lại.')
    }
  }, [])

  useEffect(() => { void loadCatalog() }, [loadCatalog])

  const options = useMemo<ReceiveOption[]>(() => {
    if (kind === 'product') {
      return variants
        .filter((item) => parseAdminEntityId(item.id).kind === 'variant')
        .map((item) => ({
          id: item.id,
          label: item.name,
          detail: `${item.category}${item.sizeLabel || item.size ? ` · ${item.sizeLabel || item.size}` : ''}`,
          sku: item.sku,
          price: item.price,
          shelfLifeDays: item.shelfLifeDays ?? null,
        }))
    }
    if (kind === 'component') {
      return components.map((item) => ({
        id: String(item.linh_kien_id),
        label: item.ten_linh_kien,
        detail: item.don_vi_tinh ? `Đơn vị: ${item.don_vi_tinh}` : 'Linh kiện',
        sku: item.sku,
        price: item.gia_don_vi,
        shelfLifeDays: null,
      }))
    }
    return giftBoxes.map((item) => ({
      id: String(item.hop_qua_id),
      label: item.ten_hop_qua,
      detail: item.kich_thuoc ? `Kích thước: ${item.kich_thuoc}` : 'Hộp quà',
      sku: item.sku,
      price: item.gia_ban,
      shelfLifeDays: null,
    }))
  }, [components, giftBoxes, kind, variants])

  const selectedOption = options.find((item) => item.id === selectedId) ?? null
  const selectedSku = selectedOption?.sku
  const selectedSupplier = suppliers.find((item) => String(item.ncc_id) === values.ncc_id) ?? null
  const totalValue = Math.max(0, Number(values.so_luong) || 0) * Math.max(0, Number(values.gia_don_vi) || 0)
  const hasStarted = Boolean(selectedId || values.ncc_id || values.ma_lo || values.ngay_san_xuat || values.ngay_het_han || values.ghi_chu || values.so_luong !== 1 || values.gia_don_vi !== 0)
  useUnsavedChanges(!submitting && hasStarted)

  useEffect(() => {
    setWarnings([])
    setAckWarnings(false)
  }, [selectedId, values])

  useEffect(() => {
    if (kind !== 'product' || manualExpiry || !values.ngay_san_xuat || !selectedOption?.shelfLifeDays) return
    const calculated = addDays(values.ngay_san_xuat, selectedOption.shelfLifeDays)
    if (values.ngay_het_han !== calculated) setValues((current) => ({ ...current, ngay_het_han: calculated }))
  }, [kind, manualExpiry, selectedOption?.shelfLifeDays, values.ngay_het_han, values.ngay_san_xuat])

  useEffect(() => {
    if (!selectedId || lotCodeManuallyEdited || (kind === 'product' && !values.ngay_san_xuat)) return
    const itemId = kind === 'product' ? parseAdminEntityId(selectedId).id : Number(selectedId)
    const apiKind: BatchCodeKind = kind === 'product' ? 'products' : kind === 'component' ? 'components' : 'gift_boxes'
    const referenceDate = kind === 'product' ? values.ngay_san_xuat : todayValue()
    let cancelled = false

    setValues((current) => ({ ...current, ma_lo: fallbackLotCode(selectedSku, referenceDate) }))
    void suggestBatchCode(apiKind, itemId, referenceDate)
      .then((suggestion) => {
        if (!cancelled) setValues((current) => ({ ...current, ma_lo: suggestion.ma_lo }))
      })
      .catch(() => {
        // Keep the deterministic local fallback when the suggestion endpoint is unavailable.
      })

    return () => { cancelled = true }
  }, [kind, lotCodeManuallyEdited, selectedId, selectedSku, values.ngay_san_xuat])

  useEffect(() => {
    if (!requestedVariant || kind !== 'product' || selectedId) return
    const requested = options.find((item) => item.id === requestedVariant)
    if (!requested) return
    setSelectedId(requested.id)
    setValues((current) => ({ ...current, gia_don_vi: requested.price, ngay_san_xuat: current.ngay_san_xuat || todayValue() }))
  }, [kind, options, requestedVariant, selectedId])

  const switchKind = (nextKind: BatchKind | null) => {
    if (!nextKind || nextKind === kind) return
    setKind(nextKind)
    setSelectedId('')
    setManualExpiry(false)
    setLotCodeManuallyEdited(false)
    setFieldErrors({})
    setValues((current) => ({ ...current, ma_lo: '', ngay_san_xuat: '', ngay_het_han: '', so_luong: 1, gia_don_vi: 0 }))
  }

  const selectItem = (item: ReceiveOption | null) => {
    setSelectedId(item?.id ?? '')
    setManualExpiry(false)
    setLotCodeManuallyEdited(false)
    setFieldErrors((current) => ({ ...current, item: '' }))
    setValues((current) => ({
      ...current,
      ma_lo: '',
      gia_don_vi: item?.price ?? 0,
      ngay_san_xuat: kind === 'product' && item ? (current.ngay_san_xuat || todayValue()) : current.ngay_san_xuat,
      ngay_het_han: kind === 'product' && !item ? '' : current.ngay_het_han,
    }))
  }

  const reset = () => {
    setValues(emptyValues)
    setSelectedId('')
    setError(null)
    setWarnings([])
    setAckWarnings(false)
    setManualExpiry(false)
    setLotCodeManuallyEdited(false)
    setFieldErrors({})
  }

  const submit = async () => {
    const errors = validateBatch(values, { requireProductionDate: kind === 'product' })
    if (!selectedId) errors.item = `Vui lòng chọn ${kindMeta[kind].itemLabel.toLowerCase()}`
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Kiểm tra lại các trường bắt buộc trước khi tạo lô.')
      return
    }

    const messages = Object.values(validateBatchSoft(values))
    if (messages.length > 0 && !ackWarnings) {
      setWarnings(messages)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const common = {
        ncc_id: values.ncc_id ? Number(values.ncc_id) : null,
        ma_lo: lotCodeManuallyEdited ? values.ma_lo.trim() : null,
        ngay_het_han: new Date(`${values.ngay_het_han}T23:59:59`).toISOString(),
        so_luong: Number(values.so_luong),
        gia_don_vi: Number(values.gia_don_vi),
        ghi_chu: values.ghi_chu.trim() || null,
        trang_thai: 'hoatdong' as const,
      }
      if (kind === 'product') {
        const entity = parseAdminEntityId(selectedId)
        if (entity.kind !== 'variant') throw new Error('Biến thể sản phẩm không hợp lệ')
        await createProductBatch({ ...common, bienthe_sanpham_id: entity.id, ngay_san_xuat: new Date(`${values.ngay_san_xuat}T00:00:00`).toISOString(), ngay_het_han: manualExpiry ? common.ngay_het_han : null })
      } else if (kind === 'component') {
        await createComponentBatch({ ...common, linh_kien_id: Number(selectedId) })
      } else {
        await createGiftBoxBatch({ ...common, hop_qua_id: Number(selectedId) })
      }
      showSuccess('Đã tạo lô hàng và cập nhật tồn kho.')
      reset()
    } catch (caught: unknown) {
      const detail = caught && typeof caught === 'object' && 'detail' in caught ? (caught as { detail?: unknown }).detail : undefined
      const message = typeof detail === 'string' ? detail : 'Không thể tạo lô hàng'
      setError(message)
      showError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminPage title="Nhập lô hàng" breadcrumb={[{ label: 'Nhập lô' }]} actions={<Button variant="outlined" onClick={() => navigate('/admin/inventory')}>Xem tồn kho</Button>}>
      <Stack spacing={2.5}>
        <Typography color="text.secondary">Tạo lô mới theo đúng mặt hàng, hạn dùng và giá nhập. Tồn kho sẽ được cập nhật ngay sau khi lưu.</Typography>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {catalogState === 'error' && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => void loadCatalog()}>Tải lại</Button>}>Danh mục chưa sẵn sàng. Hãy tải lại trước khi nhập lô.</Alert>}
        {warnings.length > 0 && (
          <Alert severity="warning">
            <AlertTitle>Kiểm tra lại trước khi lưu</AlertTitle>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{warnings.map((message) => <li key={message}>{message}</li>)}</Box>
            <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={ackWarnings} onChange={(event) => setAckWarnings(event.target.checked)} />} label="Tôi đã kiểm tra, số liệu đúng" />
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>1. Chọn loại hàng</Typography>
              <Typography variant="body2" color="text.secondary">{kindMeta[kind].description}</Typography>
            </Box>
            <ToggleButtonGroup exclusive value={kind} onChange={(_event, nextKind: BatchKind | null) => switchKind(nextKind)} aria-label="Loại lô hàng" sx={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
              {(Object.keys(kindMeta) as BatchKind[]).map((item) => <ToggleButton key={item} value={item} sx={{ px: 2 }}>{kindMeta[item].label}</ToggleButton>)}
            </ToggleButtonGroup>
          </Stack>
        </Paper>

        <Box component="form" onSubmit={(event) => { event.preventDefault(); void submit() }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.65fr) minmax(280px, 0.85fr)' }, gap: 2.5, alignItems: 'start' }}>
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>2. Chọn mặt hàng</Typography>
                    <Typography variant="body2" color="text.secondary">Chọn đúng {kindMeta[kind].itemLabel.toLowerCase()} để lấy giá và HSD mặc định.</Typography>
                  </Box>
                  <Autocomplete
                    options={options}
                    value={selectedOption}
                    onChange={(_event, item) => selectItem(item)}
                    loading={catalogState === 'loading'}
                    disabled={catalogState !== 'ready'}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(item) => item.label}
                    noOptionsText="Không tìm thấy mặt hàng"
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.id} sx={{ display: 'block !important', py: '10px !important' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={600} noWrap>{option.label}</Typography><Typography variant="caption" color="text.secondary">{option.detail}{option.sku ? ` · ${option.sku}` : ''}</Typography></Box>
                          <Typography variant="body2" fontWeight={700} whiteSpace="nowrap">{formatPrice(option.price)}</Typography>
                        </Stack>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label={kindMeta[kind].itemLabel}
                        placeholder="Tìm theo tên, size hoặc SKU"
                        error={Boolean(fieldErrors.item)}
                        helperText={fieldErrors.item || (catalogState === 'loading' ? 'Đang tải danh mục...' : 'Giá nhập mặc định được điền sau khi chọn.')}
                        InputProps={{ ...params.InputProps, endAdornment: <>{catalogState === 'loading' ? <CircularProgress color="inherit" size={18} /> : null}{params.InputProps.endAdornment}</> }}
                      />
                    )}
                  />
                  <Autocomplete
                    options={suppliers}
                    value={selectedSupplier}
                    onChange={(_event, item) => setValues((current) => ({ ...current, ncc_id: item ? String(item.ncc_id) : '' }))}
                    getOptionLabel={(item) => item.ten_ncc}
                    isOptionEqualToValue={(option, value) => option.ncc_id === value.ncc_id}
                    noOptionsText="Chưa có nhà cung cấp phù hợp"
                    renderInput={(params) => <TextField {...params} label="Nhà cung cấp" placeholder="Không bắt buộc" InputProps={{ ...params.InputProps, startAdornment: <LocalShippingOutlinedIcon color="action" fontSize="small" sx={{ mr: 1 }} /> }} />}
                  />
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack spacing={2}>
                  <Box><Typography variant="subtitle1" fontWeight={700}>3. Thông tin lô</Typography><Typography variant="body2" color="text.secondary">Mã lô dùng để truy vết xuất xứ, hạn dùng và lịch sử tồn kho.</Typography></Box>
                  <TextField fullWidth required label="Mã lô" value={values.ma_lo} onChange={(event) => { setLotCodeManuallyEdited(true); setValues((current) => ({ ...current, ma_lo: event.target.value })) }} error={Boolean(fieldErrors.ma_lo)} helperText={fieldErrors.ma_lo || (lotCodeManuallyEdited ? 'Mã lô chỉnh tay.' : 'Tự sinh theo SKU + ngày; vẫn có thể sửa.')} />
                  {kind === 'product' && <TextField fullWidth required type="date" label="Ngày sản xuất" InputLabelProps={{ shrink: true }} value={values.ngay_san_xuat} onChange={(event) => setValues((current) => ({ ...current, ngay_san_xuat: event.target.value }))} error={Boolean(fieldErrors.ngay_san_xuat)} helperText={fieldErrors.ngay_san_xuat || 'Ngày hết hạn sẽ tính tự động theo HSD của sản phẩm.'} />}
                  <Box>
                    <TextField
                      fullWidth required type="date" label="Ngày hết hạn" InputLabelProps={{ shrink: true }} value={values.ngay_het_han}
                      disabled={kind === 'product' && Boolean(selectedOption?.shelfLifeDays) && !manualExpiry}
                      onChange={(event) => { setManualExpiry(true); setValues((current) => ({ ...current, ngay_het_han: event.target.value })) }}
                      error={Boolean(fieldErrors.ngay_het_han)}
                      helperText={fieldErrors.ngay_het_han || (kind === 'product' ? selectedOption?.shelfLifeDays ? `Tự tính từ HSD ${selectedOption.shelfLifeDays} ngày${manualExpiry ? ' · đang chỉnh tay' : ''}.` : 'Sản phẩm chưa có HSD mặc định; cần nhập thủ công.' : 'Nhập hạn dùng theo thông tin từ nhà cung cấp.')}
                    />
                    {kind === 'product' && selectedOption?.shelfLifeDays && <Button type="button" size="small" startIcon={<RestartAltOutlinedIcon />} onClick={() => setManualExpiry((current) => !current)} sx={{ mt: 0.75 }}>{manualExpiry ? 'Dùng lại HSD mặc định' : 'Chỉnh ngày hết hạn'}</Button>}
                  </Box>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack spacing={2}>
                  <Box><Typography variant="subtitle1" fontWeight={700}>4. Số lượng và giá</Typography><Typography variant="body2" color="text.secondary">Kiểm tra giá nhập thực tế trước khi ghi nhận vào tồn kho.</Typography></Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField fullWidth required type="number" label="Số lượng nhập" inputProps={{ min: 1, step: 1 }} value={values.so_luong} onChange={(event) => setValues((current) => ({ ...current, so_luong: Number(event.target.value) }))} error={Boolean(fieldErrors.so_luong)} helperText={fieldErrors.so_luong || 'Đơn vị theo mặt hàng đã chọn'} />
                    <TextField fullWidth required type="number" label="Giá đơn vị" inputProps={{ min: 0, step: 1000 }} value={values.gia_don_vi || ''} onChange={(event) => setValues((current) => ({ ...current, gia_don_vi: Number(event.target.value) }))} error={Boolean(fieldErrors.gia_don_vi)} helperText={fieldErrors.gia_don_vi || 'Có thể điều chỉnh theo hóa đơn nhập'} />
                  </Box>
                  <TextField fullWidth label="Ghi chú" multiline minRows={2} value={values.ghi_chu} onChange={(event) => setValues((current) => ({ ...current, ghi_chu: event.target.value }))} placeholder="Ví dụ: nhập từ đơn PO-001, cần kiểm định..." />
                </Stack>
              </Paper>

              <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" spacing={1.25}>
                <Button type="button" onClick={reset} disabled={submitting}>Đặt lại</Button>
                <Button type="submit" variant="contained" startIcon={<AddBusinessOutlinedIcon />} disabled={submitting || catalogState !== 'ready' || (warnings.length > 0 && !ackWarnings)}>{submitting ? 'Đang tạo lô...' : 'Tạo lô và cập nhật tồn kho'}</Button>
              </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2.5, position: { lg: 'sticky' }, top: { lg: 24 }, bgcolor: 'background.paper' }}>
              <Stack spacing={2}>
                <Box><Typography variant="subtitle1" fontWeight={700}>Tóm tắt lô hàng</Typography><Typography variant="body2" color="text.secondary">Rà soát một lần cuối trước khi ghi nhận.</Typography></Box>
                <Divider />
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: selectedOption?.shelfLifeDays ? alpha(theme.palette.secondary.main, 0.12) : 'grey.100', color: selectedOption?.shelfLifeDays ? 'secondary.dark' : 'text.secondary' }}><Inventory2OutlinedIcon fontSize="small" /></Box>
                  <Box sx={{ minWidth: 0 }}><Typography variant="body2" color="text.secondary">{kindMeta[kind].label}</Typography><Typography fontWeight={700}>{selectedOption?.label || `Chưa chọn ${kindMeta[kind].itemLabel.toLowerCase()}`}</Typography>{selectedOption && <Typography variant="caption" color="text.secondary">{selectedOption.detail}{selectedOption.sku ? ` · ${selectedOption.sku}` : ''}</Typography>}</Box>
                </Stack>
                <Divider />
                <Stack spacing={1.25}>
                  <SummaryRow label="Nhà cung cấp" value={selectedSupplier?.ten_ncc || 'Chưa chọn'} />
                  <SummaryRow label="Mã lô" value={values.ma_lo || 'Chưa nhập'} />
                  {kind === 'product' && <SummaryRow label="Ngày sản xuất" value={formatDate(values.ngay_san_xuat)} />}
                  <SummaryRow label="Ngày hết hạn" value={formatDate(values.ngay_het_han)} icon={<CalendarMonthOutlinedIcon fontSize="small" />} />
                  {kind === 'product' && selectedOption?.shelfLifeDays && <SummaryRow label="HSD áp dụng" value={`${selectedOption.shelfLifeDays} ngày${manualExpiry ? ' · chỉnh tay' : ''}`} />}
                </Stack>
                <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'grey.50' }}>
                  <Stack spacing={0.75}>
                    <SummaryRow label="Số lượng nhập" value={String(Math.max(0, Number(values.so_luong) || 0))} />
                    <SummaryRow label="Giá đơn vị" value={formatPrice(Math.max(0, Number(values.gia_don_vi) || 0))} />
                    <Divider />
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}><Stack direction="row" alignItems="center" spacing={0.75}><PriceCheckOutlinedIcon color="primary" fontSize="small" /><Typography variant="body2" fontWeight={700}>Giá trị lô</Typography></Stack><Typography color="primary" fontWeight={800}>{formatPrice(totalValue)}</Typography></Stack>
                  </Stack>
                </Box>
                <Chip variant="outlined" color="success" label="Tồn kho sẽ tăng sau khi tạo lô" sx={{ alignSelf: 'flex-start' }} />
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Stack>
    </AdminPage>
  )
}

function SummaryRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, textAlign: 'right' }}>{icon}<Typography variant="body2" fontWeight={600} noWrap>{value}</Typography></Stack>
    </Stack>
  )
}
