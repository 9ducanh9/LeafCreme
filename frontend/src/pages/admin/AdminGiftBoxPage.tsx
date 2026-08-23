import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import { useNavigate } from 'react-router-dom'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar from '../../components/admin/ui/data-table-toolbar'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import {
  createGiftBox, deleteGiftBox, getGiftBoxes, updateGiftBox, type GiftBoxCreate, type GiftBoxUpdate,
} from '../../services/admin/giftBoxService'
import type { BackendGiftBox } from '../../types/giftBox'
import { useAuth } from '../../contexts/AuthContext'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import { useUnsavedChanges } from '../../hooks/admin/useUnsavedChanges'
import { downloadCsv } from '../../utils/admin/exportCsv'
import { useAdminCreateAction } from '../../contexts/AdminCreateActionContext'

const blank: GiftBoxCreate = { ten_hop_qua: '', sku: '', gia_ban: 0, mo_ta: '', hinh_anh_url: '', kich_thuoc: '', trong_luong: 0, dang_hoat_dong: true }
const columns: Column<BackendGiftBox>[] = [
  { id: 'hop_qua_id', label: 'Mã', numeric: true, sortable: true },
  { id: 'ten_hop_qua', label: 'Tên hộp quà', sortable: true },
  { id: 'sku', label: 'SKU' },
  // gia_ban tới từ backend là string ("250000.00", Decimal serialize qua JSON)
  // dù type khai number — .toLocaleString() trên string không format gì cả
  // (rơi vào Object.prototype, không phải Number.prototype), phải Number() trước.
  { id: 'gia_ban', label: 'Giá bán', numeric: true, sortable: true, render: (row) => `${Number(row.gia_ban).toLocaleString('vi-VN')} ₫` },
  { id: 'dang_hoat_dong', label: 'Trạng thái', render: (row) => row.dang_hoat_dong ? 'Đang bán' : 'Ẩn' },
]

export default function AdminGiftBoxPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const table = useDataTableState({ key: 'gift_boxes', defaultSortBy: 'ngay_tao', defaultSortDir: 'desc', defaultPageSize: 50, filterKeys: ['search'] })
  const search = table.filters.search || ''
  const [rows, setRows] = useState<BackendGiftBox[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BackendGiftBox | null>(null)
  const [form, setForm] = useState<GiftBoxCreate>(blank)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  // So Number(...) chứ không so trực tiếp — editing.gia_ban là string từ
  // backend dù type khai number, so !== với number sẽ luôn true (isDirty
  // giả) ngay cả khi mới mở form sửa, chưa đổi gì.
  const isDirty = dialogOpen && (form.ten_hop_qua !== (editing?.ten_hop_qua || '') || Number(form.gia_ban) !== Number(editing?.gia_ban ?? 0) || form.mo_ta !== (editing?.mo_ta || '') || form.sku !== (editing?.sku || '') || form.hinh_anh_url !== (editing?.hinh_anh_url || ''))
  useUnsavedChanges(isDirty)
  useEffect(() => { setSelected(new Set()) }, [table.sortBy, table.sortDir, search])

  const load = useCallback(async () => {
    setStatus('loading'); setError(null)
    try {
      const page = await getGiftBoxes({ search: search || undefined, skip: table.skip, limit: table.pageSize, sort_by: table.sortBy, sort_dir: table.sortDir })
      setRows(page.items); setTotal(page.total); setStatus('idle')
    }
    catch { setError('Không thể tải danh sách hộp quà'); setStatus('error') }
  }, [search, table.skip, table.pageSize, table.sortBy, table.sortDir])
  useEffect(() => { void load() }, [load])

  const exportSelected = () => {
    const selectedRows = rows.filter((row) => selected.has(row.hop_qua_id))
    downloadCsv(
      `hop-qua-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Mã', 'Tên hộp quà', 'SKU', 'Giá bán', 'Trạng thái'],
      selectedRows.map((row) => [row.hop_qua_id, row.ten_hop_qua, row.sku || '', row.gia_ban, row.dang_hoat_dong ? 'Đang bán' : 'Ẩn']),
    )
  }

  const openCreate = () => { setEditing(null); setForm({ ...blank }); setFieldErrors({}); setDialogOpen(true) }
  useAdminCreateAction(can('giftbox.write') ? openCreate : null)
  const openEdit = (row: BackendGiftBox) => {
    setEditing(row)
    setForm({ ten_hop_qua: row.ten_hop_qua, sku: row.sku || '', gia_ban: row.gia_ban, mo_ta: row.mo_ta || '', hinh_anh_url: row.hinh_anh_url || '', kich_thuoc: row.kich_thuoc || '', trong_luong: row.trong_luong || 0, dang_hoat_dong: row.dang_hoat_dong })
    setFieldErrors({})
    setDialogOpen(true)
  }
  const closeDialog = () => { setDialogOpen(false); setFieldErrors({}) }
  const validate = () => {
    const errors: Record<string, string> = {}
    if (!form.ten_hop_qua.trim()) errors.ten_hop_qua = 'Tên hộp quà là bắt buộc'
    if (form.gia_ban <= 0) errors.gia_ban = 'Giá bán phải lớn hơn 0'
    return errors
  }
  const save = async () => {
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    try {
      if (editing) await updateGiftBox(editing.hop_qua_id, form as GiftBoxUpdate)
      else await createGiftBox(form)
      closeDialog(); await load()
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
      <DataTableToolbar
        search={search}
        onSearchChange={(value) => table.patch({ filters: { ...table.filters, search: value } })}
        onClear={search ? () => table.patch({ filters: {} }) : undefined}
        actions={can('giftbox.write') ? <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>Thêm hộp quà</Button> : undefined}
      />
      <DataTable
        caption="Danh sách hộp quà" columns={columns} rows={rows} getRowId={(row) => row.hop_qua_id} getRowLabel={(row) => row.ten_hop_qua}
        total={total} page={table.page} pageSize={table.pageSize} onPageChange={(page) => table.patch({ page })} onPageSizeChange={(pageSize) => table.patch({ pageSize })}
        sortBy={table.sortBy} sortDir={table.sortDir} onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })}
        status={status} error={error} onRetry={() => void load()} hasActiveFilters={Boolean(search)} onClearFilters={() => table.patch({ filters: {} })}
        selectedIds={selected} onSelectionChange={setSelected}
        bulkActions={<Button size="small" startIcon={<FileDownloadIcon />} onClick={exportSelected}>Xuất CSV</Button>}
        rowActions={(row) => <>{can('giftbox.read') && <IconButton aria-label="Mở công thức BOM" onClick={() => navigate(`/admin/gift-boxes/${row.hop_qua_id}/bom`)}><Inventory2Icon fontSize="small" /></IconButton>}{can('giftbox.write') && <IconButton aria-label="Sửa hộp quà" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>}{can('giftbox.delete') && <IconButton aria-label="Xoá hộp quà" onClick={() => setDeleteId(row.hop_qua_id)}><DeleteIcon fontSize="small" /></IconButton>}</>}
      />
      <Dialog
        open={dialogOpen}
        onClose={(_, reason) => {
          if (isDirty && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return
          closeDialog()
        }}
        disableEscapeKeyDown={isDirty}
        fullWidth maxWidth="sm"
      >
        <DialogTitle>{editing ? 'Chỉnh sửa hộp quà' : 'Tạo hộp quà mới'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Tên hộp quà" required value={form.ten_hop_qua} onChange={(event) => setForm({ ...form, ten_hop_qua: event.target.value })} error={Boolean(fieldErrors.ten_hop_qua)} helperText={fieldErrors.ten_hop_qua} />
          <TextField label="SKU" value={form.sku || ''} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
          <TextField label="Giá bán" type="number" required value={form.gia_ban || ''} onChange={(event) => setForm({ ...form, gia_ban: Number(event.target.value) })} error={Boolean(fieldErrors.gia_ban)} helperText={fieldErrors.gia_ban} />
          <TextField label="Mô tả" multiline minRows={3} value={form.mo_ta || ''} onChange={(event) => setForm({ ...form, mo_ta: event.target.value })} />
          <TextField label="URL hình ảnh" value={form.hinh_anh_url || ''} onChange={(event) => setForm({ ...form, hinh_anh_url: event.target.value })} />
        </DialogContent>
        <DialogActions><Button onClick={closeDialog}>Huỷ</Button><Button variant="contained" onClick={() => void save()}>Lưu</Button></DialogActions>
      </Dialog>
      <ConfirmDialog isOpen={deleteId !== null} message="Bạn có chắc muốn xoá hộp quà này?" confirmLabel="Xoá" cancelLabel="Huỷ" onConfirm={() => void remove()} onCancel={() => setDeleteId(null)} variant="danger" />
    </AdminPage>
  )
}
