// Manual Order Form — "Tạo đơn thủ công": khách nhắn tin đặt hoặc mua trực
// tiếp tại quầy. Gọi thẳng POST /orders (đã có sẵn ở backend, trước đây
// không có UI nào gọi tới).
import { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Box, Typography, Alert, IconButton, ToggleButtonGroup, ToggleButton,
  Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { type Dayjs } from 'dayjs'
import DeleteIcon from '@mui/icons-material/Delete'
import { getProductVariants } from '../../../services/admin/productService'
import { parseAdminEntityId } from '../../../types/admin'
import { getGiftBoxes } from '../../../services/admin/giftBoxService'
import { createOrder, type CreateOrderLineItem } from '../../../services/admin/adminOrderService'
import type { Order } from '../../../types/admin'
import type { ApiError } from '../../../services/api'
import { formatPrice } from '../../../utils/formatPrice'
import { useToast } from '../../../contexts/ToastContext'
import { useUnsavedChanges } from '../../../hooks/admin/useUnsavedChanges'

interface PickableItem {
  key: string
  label: string
  price: number
  bienthe_id?: number
  hop_qua_id?: number
}

interface LineItem extends PickableItem {
  quantity: number
}

interface ManualOrderFormProps {
  open: boolean
  onClose: () => void
  onCreated: (order: Order) => void
}

export default function ManualOrderForm({ open, onClose, onCreated }: ManualOrderFormProps) {
  const { showSuccess, showError } = useToast()
  const [loaiDon, setLoaiDon] = useState<'pos' | 'dat_truoc'>('pos')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [address, setAddress] = useState('')
  const [expectedDate, setExpectedDate] = useState<Dayjs | null>(null)
  const [deposit, setDeposit] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [pickerValue, setPickerValue] = useState<PickableItem | null>(null)

  const [pickables, setPickables] = useState<PickableItem[]>([])
  const [loadingPickables, setLoadingPickables] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingPickables(true)
    Promise.all([getProductVariants({ limit: 200 }), getGiftBoxes({ dang_hoat_dong: true })])
      .then(([variantPage, giftBoxPage]) => {
        if (cancelled) return
        const variantItems: PickableItem[] = variantPage.items
          .filter((v) => v.status === 'active' && parseAdminEntityId(v.id).kind === 'variant')
          .map((v) => {
            const entity = parseAdminEntityId(v.id)
            return { key: v.id, label: `${v.name} — ${v.sizeLabel || v.size}`, price: v.price, bienthe_id: entity.kind === 'variant' ? entity.id : undefined }
          })
        const giftBoxItems: PickableItem[] = giftBoxPage.items.map((g) => ({
          key: `giftbox:${g.hop_qua_id}`, label: `${g.ten_hop_qua} (Hộp quà)`, price: g.gia_ban, hop_qua_id: g.hop_qua_id,
        }))
        setPickables([...variantItems, ...giftBoxItems])
      })
      .catch(() => { if (!cancelled) showError('Không thể tải danh sách sản phẩm/hộp quà') })
      .finally(() => { if (!cancelled) setLoadingPickables(false) })
    return () => { cancelled = true }
  }, [open, showError])

  const resetForm = () => {
    setLoaiDon('pos'); setCustomerName(''); setPhone(''); setFulfillment('pickup'); setAddress('')
    setExpectedDate(null); setDeposit(''); setVoucherCode(''); setNotes(''); setLineItems([]); setPickerValue(null)
    setError(null)
  }

  const handleClose = () => {
    if (submitting) return
    resetForm()
    onClose()
  }

  const addLineItem = (item: PickableItem | null) => {
    if (!item) return
    setLineItems((prev) => {
      const existing = prev.find((li) => li.key === item.key)
      if (existing) return prev.map((li) => (li.key === item.key ? { ...li, quantity: li.quantity + 1 } : li))
      return [...prev, { ...item, quantity: 1 }]
    })
    setPickerValue(null)
  }

  const updateQuantity = (key: string, quantity: number) => {
    setLineItems((prev) => prev.map((li) => (li.key === key ? { ...li, quantity: Math.max(1, Math.floor(quantity) || 1) } : li)))
  }

  const removeLineItem = (key: string) => setLineItems((prev) => prev.filter((li) => li.key !== key))

  const total = useMemo(() => lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0), [lineItems])

  // Đơn thủ công có thể có nhiều dòng sản phẩm — bấm sai backdrop/Escape
  // giữa chừng không được mất dữ liệu (spec 11 §4-§5).
  const isDirty = Boolean(customerName || phone || address || notes || voucherCode || deposit || lineItems.length > 0)
  useUnsavedChanges(open && isDirty && !submitting)

  const handleSubmit = async () => {
    setError(null)
    if (lineItems.length === 0) { setError('Thêm ít nhất 1 sản phẩm vào đơn.'); return }
    if (fulfillment === 'delivery' && !address.trim()) { setError('Nhập địa chỉ giao hàng.'); return }

    setSubmitting(true)
    try {
      const items: CreateOrderLineItem[] = lineItems.map((li) => ({
        bienthe_id: li.bienthe_id,
        hop_qua_id: li.hop_qua_id,
        so_luong: li.quantity,
      }))
      const order = await createOrder({
        loai_don: loaiDon,
        items,
        ten_khach_hang: customerName.trim() || undefined,
        so_dien_thoai_khach: phone.trim() || undefined,
        dia_chi_giao_hang: fulfillment === 'delivery' ? address.trim() : undefined,
        ngay_giao_du_kien: expectedDate ? expectedDate.toISOString() : undefined,
        tien_dat_coc: loaiDon === 'dat_truoc' && deposit ? Number(deposit) : undefined,
        ghi_chu: notes.trim() || undefined,
        phieu_giam_gia_codes: voucherCode.trim() ? [voucherCode.trim()] : undefined,
      })
      showSuccess(`Đã tạo đơn ${order.orderCode}`)
      onCreated(order)
      resetForm()
      onClose()
    } catch (err) {
      const apiError = err as ApiError
      const detail = apiError?.detail
      setError(Array.isArray(detail) ? detail.join(', ') : detail || apiError?.error || 'Không thể tạo đơn hàng')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        // Escape/backdrop khi đang nhập dở không được đóng ngay — chỉ nút
        // "Hủy" tường minh mới đóng (spec 11 §5).
        if (isDirty && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return
        handleClose()
      }}
      disableEscapeKeyDown={isDirty}
      maxWidth="sm" fullWidth
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DialogTitle>Tạo đơn thủ công</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <FormControl size="small">
              <InputLabel>Loại đơn</InputLabel>
              <Select value={loaiDon} label="Loại đơn" onChange={(e) => setLoaiDon(e.target.value as 'pos' | 'dat_truoc')}>
                <MenuItem value="pos">Thủ công (tại quầy / nhắn tin)</MenuItem>
                <MenuItem value="dat_truoc">Đặt trước (có cọc)</MenuItem>
              </Select>
            </FormControl>
            <Box />
            <TextField size="small" label="Tên khách hàng" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <TextField size="small" label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Hình thức nhận hàng</Typography>
              <ToggleButtonGroup size="small" exclusive value={fulfillment} onChange={(_, v) => v && setFulfillment(v)}>
                <ToggleButton value="pickup">Lấy tại quầy</ToggleButton>
                <ToggleButton value="delivery">Giao hàng</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {fulfillment === 'delivery' && (
              <TextField sx={{ gridColumn: '1 / -1' }} size="small" label="Địa chỉ giao hàng" value={address} onChange={(e) => setAddress(e.target.value)} />
            )}

            <DateTimePicker
              label="Ngày giao / lấy dự kiến"
              value={expectedDate}
              onChange={setExpectedDate}
              minDateTime={dayjs()}
              slotProps={{ textField: { size: 'small' } }}
            />
            {loaiDon === 'dat_truoc' && (
              <TextField
                size="small" label="Tiền đặt cọc" type="number" value={deposit}
                onChange={(e) => setDeposit(e.target.value)} inputProps={{ min: 0, step: 10000 }}
              />
            )}

            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Sản phẩm trong đơn</Typography>
              <Autocomplete
                size="small"
                options={pickables}
                loading={loadingPickables}
                value={pickerValue}
                onChange={(_, item) => addLineItem(item)}
                getOptionLabel={(item) => `${item.label} — ${formatPrice(item.price)}`}
                isOptionEqualToValue={(a, b) => a.key === b.key}
                renderInput={(params) => <TextField {...params} label="Thêm sản phẩm / hộp quà" placeholder="Tìm theo tên..." />}
              />
              {lineItems.length > 0 && (
                <TableContainer sx={{ mt: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell align="right" sx={{ width: 90 }}>SL</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="right" sx={{ width: 40 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((li) => (
                        <TableRow key={li.key}>
                          <TableCell>{li.label}</TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small" type="number" value={li.quantity}
                              onChange={(e) => updateQuantity(li.key, Number(e.target.value))}
                              inputProps={{ min: 1, style: { textAlign: 'right', width: 48 } }}
                            />
                          </TableCell>
                          <TableCell align="right">{formatPrice(li.price)}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" aria-label="Xóa dòng" onClick={() => removeLineItem(li.key)}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {lineItems.length > 0 && (
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', fontWeight: 600 }}>
                  Tạm tính: {formatPrice(total)}
                </Typography>
              )}
            </Box>

            <TextField size="small" label="Mã giảm giá (nếu có)" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} />
            <Box />
            <TextField sx={{ gridColumn: '1 / -1' }} size="small" multiline rows={2} label="Ghi chú" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>Hủy</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}
          </Button>
        </DialogActions>
      </LocalizationProvider>
    </Dialog>
  )
}
