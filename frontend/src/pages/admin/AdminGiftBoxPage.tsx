import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar from '../../components/admin/ui/data-table-toolbar'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import {
  createGiftBox, deleteGiftBox, getGiftBoxes, updateGiftBox, type GiftBoxCreate, type GiftBoxUpdate,
} from '../../services/admin/giftBoxService'
import type { BackendGiftBox } from '../../types/giftBox'

const blank: GiftBoxCreate = { ten_hop_qua: '', sku: '', gia_ban: 0, mo_ta: '', hinh_anh_url: '', kich_thuoc: '', trong_luong: 0, dang_hoat_dong: true }
const columns: Column<BackendGiftBox>[] = [
  { id: 'hop_qua_id', label: 'Mã', numeric: true, sortable: true },
  { id: 'ten_hop_qua', label: 'Tên hộp quà', sortable: true },
  { id: 'sku', label: 'SKU' },
  { id: 'gia_ban', label: 'Giá bán', numeric: true, sortable: true, render: (row) => `${row.gia_ban.toLocaleString('vi-VN')} ₫` },
  { id: 'dang_hoat_dong', label: 'Trạng thái', render: (row) => row.dang_hoat_dong ? 'Đang bán' : 'Ẩn' },
]

export default function AdminGiftBoxPage() {
  const [rows, setRows] = useState<BackendGiftBox[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BackendGiftBox | null>(null)
  const [form, setForm] = useState<GiftBoxCreate>(blank)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setStatus('loading'); setError(null)
    try { setRows(await getGiftBoxes({ search: search || undefined })); setStatus('idle') }
    catch { setError('Không thể tải danh sách hộp quà'); setStatus('error') }
  }, [search])
  useEffect(() => { void load() }, [load])

  const openCreate = () => { setEditing(null); setForm({ ...blank }); setDialogOpen(true) }
  const openEdit = (row: BackendGiftBox) => {
    setEditing(row)
    setForm({ ten_hop_qua: row.ten_hop_qua, sku: row.sku || '', gia_ban: row.gia_ban, mo_ta: row.mo_ta || '', hinh_anh_url: row.hinh_anh_url || '', kich_thuoc: row.kich_thuoc || '', trong_luong: row.trong_luong || 0, dang_hoat_dong: row.dang_hoat_dong })
    setDialogOpen(true)
  }
  const validate = () => {
    const errors: Record<string, string> = {}
    if (!form.ten_hop_qua.trim()) errors.ten_hop_qua = 'Tên hộp quà là bắt buộc'
    if (form.gia_ban <= 0) errors.gia_ban = 'Giá bán phải lớn hơn 0'
    return errors
  }
  const save = async () => {
    if (Object.keys(validate()).length) return
    try {
      if (editing) await updateGiftBox(editing.hop_qua_id, form as GiftBoxUpdate)
      else await createGiftBox(form)
      setDialogOpen(false); await load()
    } catch { setError('Không thể lưu hộp quà') }
  }
  const remove = async () => {
    if (deleteId === null) return
    try { await deleteGiftBox(deleteId); setDeleteId(null); await load() }
    catch { setError('Không thể xoá hộp quà') }
  }

  return (
    <AdminPage title="Hộp quà" breadcrumb={[{ label: 'Hộp quà' }]}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <DataTableToolbar search={search} onSearchChange={setSearch} onClear={search ? () => setSearch('') : undefined} actions={<Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>Thêm hộp quà</Button>} />
      <DataTable caption="Danh sách hộp quà" columns={columns} rows={rows} getRowId={(row) => row.hop_qua_id} getRowLabel={(row) => row.ten_hop_qua} total={rows.length} page={0} pageSize={Math.max(25, rows.length || 25)} onPageChange={() => undefined} onPageSizeChange={() => undefined} status={status} error={error} onRetry={() => void load()} hasActiveFilters={Boolean(search)} onClearFilters={() => setSearch('')} rowActions={(row) => <><IconButton aria-label="Sửa hộp quà" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton><IconButton aria-label="Xoá hộp quà" onClick={() => setDeleteId(row.hop_qua_id)}><DeleteIcon fontSize="small" /></IconButton></>} />
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Chỉnh sửa hộp quà' : 'Tạo hộp quà mới'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Tên hộp quà" required value={form.ten_hop_qua} onChange={(event) => setForm({ ...form, ten_hop_qua: event.target.value })} />
          <TextField label="SKU" value={form.sku || ''} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
          <TextField label="Giá bán" type="number" required value={form.gia_ban || ''} onChange={(event) => setForm({ ...form, gia_ban: Number(event.target.value) })} />
          <TextField label="Mô tả" multiline minRows={3} value={form.mo_ta || ''} onChange={(event) => setForm({ ...form, mo_ta: event.target.value })} />
          <TextField label="URL hình ảnh" value={form.hinh_anh_url || ''} onChange={(event) => setForm({ ...form, hinh_anh_url: event.target.value })} />
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Huỷ</Button><Button variant="contained" onClick={() => void save()}>Lưu</Button></DialogActions>
      </Dialog>
      <ConfirmDialog isOpen={deleteId !== null} message="Bạn có chắc muốn xoá hộp quà này?" confirmLabel="Xoá" cancelLabel="Huỷ" onConfirm={() => void remove()} onCancel={() => setDeleteId(null)} variant="danger" />
    </AdminPage>
  )
}
