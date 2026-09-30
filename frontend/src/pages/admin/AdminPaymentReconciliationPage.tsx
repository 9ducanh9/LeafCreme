import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import AdminPage from '../../components/admin/ui/admin-page'
import { apiClient } from '../../services/api'
import { formatPrice } from '../../utils/formatPrice'

interface Receipt {
  transaction_id: string
  donhang_id: number | null
  so_tien: string | number
  status: string
  reason: string
  refund_reference: string | null
  refund_note: string | null
}

const reasonLabels: Record<string, string> = {
  'Cancelled order requires refund': 'Tiền về sau khi đơn đã hủy',
  'Additional transfer requires refund': 'Khoản chuyển thêm cho đơn đã thanh toán',
  'Transfer amount mismatch': 'Số tiền không khớp',
  'Inactive payment requires refund': 'Khoản thanh toán không còn hoạt động',
  'Payment not found': 'Không tìm thấy khoản thanh toán',
  'No Leaf Creme payment code': 'Thiếu mã thanh toán',
  'Payment provider mismatch': 'Mã thanh toán không thuộc SePay',
}

export default function AdminPaymentReconciliationPage() {
  const [rows, setRows] = useState<Receipt[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Receipt | null>(null)
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiClient.get<{ items: Receipt[]; total: number }>('/payments/sepay/reconciliation', { skip: page * 25, limit: 25, status: filter || undefined })
      setRows(result.items)
      setTotal(result.total)
      setError(null)
    } catch { setError('Không tải được giao dịch đối soát. Hãy thử lại.') }
    finally { setLoading(false) }
  }, [page, filter])
  useEffect(() => { void load() }, [load])
  const confirm = async () => {
    if (!selected || !reference.trim() || !note.trim() || saving) return
    setSaving(true)
    try {
      await apiClient.post(`/payments/sepay/reconciliation/${encodeURIComponent(selected.transaction_id)}/refund-confirmation`, { refund_reference: reference.trim(), refund_note: note.trim() })
      setSelected(null)
      await load()
    } catch { setError('Không xác nhận được hoàn tiền. Kiểm tra lại giao dịch rồi thử lại.') }
    finally { setSaving(false) }
  }
  return <AdminPage title="Đối soát thanh toán">
    <Alert severity="info" sx={{ mb: 2 }}>Danh sách các khoản tiền cần kiểm tra. Chỉ xác nhận hoàn tiền sau khi đã chuyển trả khách và có mã giao dịch hoàn tiền.</Alert>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
      <Select value={filter} displayEmpty inputProps={{ 'aria-label': 'Trạng thái đối soát' }} onChange={(event) => { setFilter(event.target.value); setPage(0) }}>
        <MenuItem value="">Cần xử lý</MenuItem><MenuItem value="refund_required">Cần hoàn tiền</MenuItem><MenuItem value="unmatched">Chưa khớp mã</MenuItem><MenuItem value="refunded">Đã hoàn tiền</MenuItem>
      </Select>
      <Button onClick={() => void load()} disabled={loading}>Tải lại</Button>
    </Stack>
    <Box sx={{ overflowX: 'auto' }}><Table aria-label="Giao dịch cần đối soát">
      <TableHead><TableRow><TableCell>Giao dịch</TableCell><TableCell>Đơn hàng</TableCell><TableCell>Số tiền</TableCell><TableCell>Lý do</TableCell><TableCell>Xử lý</TableCell></TableRow></TableHead>
      <TableBody>{rows.map((row) => <TableRow key={row.transaction_id}>
        <TableCell>{row.transaction_id}</TableCell><TableCell>{row.donhang_id ? <Link to={`/admin/orders/${row.donhang_id}`}>#{row.donhang_id}</Link> : 'Chưa xác định'}</TableCell>
        <TableCell>{formatPrice(Number(row.so_tien))}</TableCell><TableCell>{reasonLabels[row.reason] || row.reason}</TableCell>
        <TableCell>{row.status === 'refunded' ? <Typography variant="body2">Đã hoàn: {row.refund_reference}</Typography> : <Button onClick={() => { setSelected(row); setReference(''); setNote('') }}>Xác nhận đã hoàn tiền</Button>}</TableCell>
      </TableRow>)}</TableBody>
    </Table></Box>
    {!loading && rows.length === 0 && <Typography sx={{ my: 2 }}>Không có giao dịch ở trạng thái này.</Typography>}
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}><Button disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>Trước</Button><Typography>Trang {page + 1} · {total} giao dịch</Typography><Button disabled={(page + 1) * 25 >= total || loading} onClick={() => setPage(page + 1)}>Sau</Button></Stack>
    <Dialog open={Boolean(selected)} onClose={() => { if (!saving) setSelected(null) }} fullWidth maxWidth="sm">
      <DialogTitle>Xác nhận đã hoàn tiền {selected?.transaction_id}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ mt: 1 }}><Alert severity="warning">Thao tác này ghi nhận việc hoàn tiền đã thực hiện; cửa hàng cần chuyển tiền cho khách trước.</Alert><TextField required label="Mã giao dịch hoàn tiền" value={reference} onChange={(event) => setReference(event.target.value)} inputProps={{ maxLength: 100 }} disabled={saving} /><TextField required label="Ghi chú đối soát" multiline minRows={3} value={note} onChange={(event) => setNote(event.target.value)} inputProps={{ maxLength: 2000 }} disabled={saving} /></Stack></DialogContent>
      <DialogActions><Button disabled={saving} onClick={() => setSelected(null)}>Đóng</Button><Button disabled={saving || !reference.trim() || !note.trim()} onClick={() => void confirm()}>{saving ? 'Đang lưu...' : 'Xác nhận đã hoàn tiền'}</Button></DialogActions>
    </Dialog>
  </AdminPage>
}
