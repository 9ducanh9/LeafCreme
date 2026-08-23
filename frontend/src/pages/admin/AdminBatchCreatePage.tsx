import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertTitle, Button, Checkbox, FormControlLabel, MenuItem, TextField } from '@mui/material'
import AdminPage from '../../components/admin/ui/admin-page'
import { useAdminForm } from '../../hooks/admin/useAdminForm'
import { useUnsavedChanges } from '../../hooks/admin/useUnsavedChanges'
import { validateBatch, validateBatchSoft } from '../../utils/admin/validateBatch'
import { getProductVariants } from '../../services/admin/productService'
import { getGiftBoxes } from '../../services/admin/giftBoxService'
import { getSuppliers } from '../../services/admin/supplierService'
import { getComponents } from '../../services/admin/componentService'
import { createProductBatch, createComponentBatch, createGiftBoxBatch } from '../../services/admin/batchService'
import { useToast } from '../../contexts/ToastContext'
import { parseAdminEntityId, type ProductVariant } from '../../types/admin'
import type { BackendGiftBox } from '../../types/giftBox'

type BatchKind = 'product' | 'component' | 'giftbox'
const emptyValues = { ncc_id: '', ma_lo: '', ngay_het_han: '', so_luong: 1, gia_don_vi: 0, ghi_chu: '' }

export default function AdminBatchCreatePage() {
  const { showSuccess, showError } = useToast()
  const [kind, setKind] = useState<BatchKind>('product')
  const [values, setValues] = useState(emptyValues)
  const [selectedId, setSelectedId] = useState('')
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<typeof getSuppliers>>>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [components, setComponents] = useState<Awaited<ReturnType<typeof getComponents>>>([])
  const [giftBoxes, setGiftBoxes] = useState<BackendGiftBox[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [ackWarnings, setAckWarnings] = useState(false)

  const validate = (nextValues: typeof values) => validateBatch(nextValues)
  const adminForm = useAdminForm({ initialValues: values, validate })
  const { setValues: syncFormValues } = adminForm
  useEffect(() => { syncFormValues(values) }, [syncFormValues, values])
  useUnsavedChanges(!loading && Boolean(values.ma_lo || values.ngay_het_han || values.ghi_chu))
  // Sửa lại giá trị sau khi đã thấy cảnh báo mềm — xác nhận cũ không còn hợp lệ
  // cho số liệu mới, phải hiện lại cảnh báo và xác nhận lại.
  useEffect(() => { setWarnings([]); setAckWarnings(false) }, [values, selectedId])

  useEffect(() => {
    Promise.all([getSuppliers({ dang_hoat_dong: true }), getProductVariants({ limit: 200 }), getComponents({ dang_hoat_dong: true }), getGiftBoxes({ dang_hoat_dong: true })])
      .then(([nextSuppliers, nextVariantPage, nextComponents, nextGiftBoxPage]) => { setSuppliers(nextSuppliers); setVariants(nextVariantPage.items); setComponents(nextComponents); setGiftBoxes(nextGiftBoxPage.items) })
      .catch(() => setError('Không thể tải danh mục cho nhập lô'))
  }, [])

  const options = useMemo(() => kind === 'product' ? variants.filter((item) => parseAdminEntityId(item.id).kind === 'variant').map((item) => ({ id: item.id, label: `${item.name} · ${item.sizeLabel || item.size} · ${item.sku}`, price: item.price })) : kind === 'component' ? components.map((item) => ({ id: String(item.linh_kien_id), label: `${item.ten_linh_kien}${item.sku ? ` · ${item.sku}` : ''}`, price: item.gia_don_vi })) : giftBoxes.map((item) => ({ id: String(item.hop_qua_id), label: `${item.ten_hop_qua}${item.sku ? ` · ${item.sku}` : ''}`, price: item.gia_ban })), [components, giftBoxes, kind, variants])
  const selectItem = (id: string) => { setSelectedId(id); const selected = options.find((item) => item.id === id); if (selected) setValues((current) => ({ ...current, gia_don_vi: selected.price })) }

  const reset = () => { setValues(emptyValues); setSelectedId(''); setError(null); setWarnings([]); setAckWarnings(false) }
  const submit = async () => {
    const errors = validateBatch(values)
    if (!selectedId) errors.item = 'Vui lòng chọn đối tượng cần nhập lô'
    if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return }

    // Cảnh báo mềm: hiện ra và bắt xác nhận trước, KHÔNG tạo lô ngay — nếu
    // không, cảnh báo hiện ra đúng lúc lô đã được tạo xong thì vô nghĩa
    // (spec 11 §3.2).
    const softWarnings = validateBatchSoft(values)
    const messages = Object.values(softWarnings)
    if (messages.length > 0 && !ackWarnings) { setWarnings(messages); return }

    setLoading(true); setError(null)
    try {
      const common = { ncc_id: values.ncc_id ? Number(values.ncc_id) : null, ma_lo: values.ma_lo.trim(), ngay_het_han: new Date(`${values.ngay_het_han}T23:59:59`).toISOString(), so_luong: Number(values.so_luong), gia_don_vi: Number(values.gia_don_vi), ghi_chu: values.ghi_chu.trim() || null, trang_thai: 'hoatdong' as const }
      if (kind === 'product') {
        const entity = parseAdminEntityId(selectedId)
        if (entity.kind !== 'variant') throw new Error('Biến thể sản phẩm không hợp lệ')
        await createProductBatch({ ...common, bienthe_sanpham_id: entity.id })
      }
      if (kind === 'component') await createComponentBatch({ ...common, linh_kien_id: Number(selectedId) })
      if (kind === 'giftbox') await createGiftBoxBatch({ ...common, hop_qua_id: Number(selectedId) })
      showSuccess('Tạo lô hàng thành công'); reset()
    } catch (caught: unknown) { const detail = caught && typeof caught === 'object' && 'detail' in caught ? (caught as { detail?: unknown }).detail : undefined; const message = typeof detail === 'string' ? detail : 'Không thể tạo lô hàng'; setError(message); showError(message) }
    finally { setLoading(false) }
  }

  return (
    <AdminPage title="Nhập lô hàng" breadcrumb={[{ label: 'Nhập lô' }]}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Kiểm tra lại trước khi lưu</AlertTitle>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {warnings.map((message, index) => <li key={index}>{message}</li>)}
          </ul>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Checkbox checked={ackWarnings} onChange={(event) => setAckWarnings(event.target.checked)} />}
            label="Tôi đã kiểm tra, số liệu đúng"
          />
        </Alert>
      )}
      <form onSubmit={(event) => { event.preventDefault(); void submit() }}>
        <TextField select fullWidth label="Loại lô" value={kind} onChange={(event) => { setKind(event.target.value as BatchKind); setSelectedId('') }} sx={{ mb: 2 }}>
          <MenuItem value="product">Lô sản phẩm</MenuItem><MenuItem value="component">Lô linh kiện</MenuItem><MenuItem value="giftbox">Lô hộp quà</MenuItem>
        </TextField>
        <TextField select fullWidth label="Đối tượng" value={selectedId} onChange={(event) => selectItem(event.target.value)} sx={{ mb: 2 }}>
          <MenuItem value="">Chọn đối tượng</MenuItem>{options.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}
        </TextField>
        <TextField select fullWidth label="Nhà cung cấp" value={values.ncc_id} onChange={(event) => setValues({ ...values, ncc_id: event.target.value })} sx={{ mb: 2 }}><MenuItem value="">Không chọn</MenuItem>{suppliers.map((item) => <MenuItem key={item.ncc_id} value={item.ncc_id}>{item.ten_ncc}</MenuItem>)}</TextField>
        <TextField fullWidth required label="Mã lô" value={values.ma_lo} onChange={(event) => setValues({ ...values, ma_lo: event.target.value })} sx={{ mb: 2 }} />
        <TextField fullWidth required type="date" label="Ngày hết hạn" InputLabelProps={{ shrink: true }} value={values.ngay_het_han} onChange={(event) => setValues({ ...values, ngay_het_han: event.target.value })} sx={{ mb: 2 }} />
        <TextField fullWidth required type="number" label="Số lượng" value={values.so_luong} onChange={(event) => setValues({ ...values, so_luong: Number(event.target.value) })} sx={{ mb: 2 }} />
        <TextField fullWidth required type="number" label="Giá đơn vị" value={values.gia_don_vi || ''} onChange={(event) => setValues({ ...values, gia_don_vi: Number(event.target.value) })} sx={{ mb: 2 }} />
        <TextField fullWidth label="Ghi chú" multiline minRows={2} value={values.ghi_chu} onChange={(event) => setValues({ ...values, ghi_chu: event.target.value })} sx={{ mb: 2 }} />
        <Button type="button" onClick={reset} disabled={loading} sx={{ mr: 1 }}>Đặt lại</Button>
        <Button type="submit" variant="contained" disabled={loading || (warnings.length > 0 && !ackWarnings)}>Tạo lô</Button>
      </form>
    </AdminPage>
  )
}
