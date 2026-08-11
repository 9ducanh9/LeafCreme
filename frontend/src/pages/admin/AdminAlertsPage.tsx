import { useCallback, useEffect, useState } from 'react'
import { Alert as MuiAlert, Button, Chip, IconButton, MenuItem, TextField } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import RefreshIcon from '@mui/icons-material/Refresh'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar from '../../components/admin/ui/data-table-toolbar'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import {
  clearResolvedAlerts, getAlerts, getAlertsSummary, getAlertTypeLabel, getSeverityLabel, getStatusLabel, updateAlert,
  type Alert as AlertRow, type AlertSummary,
} from '../../services/admin/alertService'

const columns: Column<AlertRow>[] = [
  { id: 'ngay_canh_bao', label: 'Thời gian', sortable: true, render: (row) => new Date(row.ngay_canh_bao).toLocaleString('vi-VN') },
  { id: 'loai_canh_bao', label: 'Loại', render: (row) => getAlertTypeLabel(row.loai_canh_bao) },
  { id: 'muc_do_nghiem_trong', label: 'Mức độ', sortable: true, render: (row) => <Chip size="small" label={getSeverityLabel(row.muc_do_nghiem_trong)} color={row.muc_do_nghiem_trong === 'cao' ? 'error' : 'warning'} /> },
  { id: 'ten_san_pham', label: 'Đối tượng', render: (row) => row.ten_san_pham || row.ma_lo || '-' },
  { id: 'so_luong_hien_tai', label: 'Tồn hiện tại', numeric: true, render: (row) => row.so_luong_hien_tai ?? '-' },
  { id: 'trang_thai', label: 'Trạng thái', render: (row) => getStatusLabel(row.trang_thai) },
]

export default function AdminAlertsPage() {
  const table = useDataTableState({ key: 'alerts', defaultSortBy: 'ngay_canh_bao', defaultSortDir: 'desc', defaultPageSize: 50, filterKeys: ['muc_do', 'trang_thai'] })
  const [rows, setRows] = useState<AlertRow[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading'); setError(null)
    try {
      const [alerts, nextSummary] = await Promise.all([
        getAlerts({ muc_do: table.filters.muc_do, trang_thai: table.filters.trang_thai, skip: table.skip, limit: table.pageSize }),
        getAlertsSummary(),
      ])
      setRows(alerts); setSummary(nextSummary); setStatus('idle')
    } catch { setError('Không thể tải dữ liệu cảnh báo'); setStatus('error') }
  }, [table.filters, table.pageSize, table.skip])
  useEffect(() => { void load() }, [load])

  const setFilter = (name: string, value: string) => table.patch({ filters: { ...table.filters, [name]: value } })
  const resolve = async (row: AlertRow) => { try { await updateAlert(row.canhbao_id, { trang_thai: 'da_xu_ly' }); await load() } catch { setError('Không thể cập nhật cảnh báo') } }
  const clearResolved = async () => { try { await clearResolvedAlerts(); setClearConfirm(false); await load() } catch { setError('Không thể dọn cảnh báo đã xử lý') } }

  return (
    <AdminPage title="Cảnh báo tồn kho" breadcrumb={[{ label: 'Cảnh báo' }]}>
      {summary && <MuiAlert severity={summary.pending ? 'warning' : 'success'} sx={{ mb: 2 }}>Đang chờ xử lý: {summary.pending} · Đã xử lý: {summary.resolved}</MuiAlert>}
      {error && <MuiAlert severity="error" sx={{ mb: 2 }}>{error}</MuiAlert>}
      <DataTableToolbar title="Theo dõi cảnh báo" actions={<><Button startIcon={<RefreshIcon />} onClick={() => void load()}>Làm mới</Button><Button startIcon={<DeleteSweepIcon />} color="warning" onClick={() => setClearConfirm(true)}>Dọn đã xử lý</Button></>}>
        <TextField select size="small" label="Mức độ" value={table.filters.muc_do || ''} onChange={(event) => setFilter('muc_do', event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="cao">Cao</MenuItem><MenuItem value="binh_thuong">Bình thường</MenuItem><MenuItem value="thap">Thấp</MenuItem></TextField>
        <TextField select size="small" label="Trạng thái" value={table.filters.trang_thai || ''} onChange={(event) => setFilter('trang_thai', event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="chua_xu_ly">Chưa xử lý</MenuItem><MenuItem value="dang_xu_ly">Đang xử lý</MenuItem><MenuItem value="da_xu_ly">Đã xử lý</MenuItem></TextField>
      </DataTableToolbar>
      <DataTable caption="Danh sách cảnh báo tồn kho" columns={columns} rows={rows} getRowId={(row) => row.canhbao_id} getRowLabel={(row) => row.ten_san_pham || `Cảnh báo #${row.canhbao_id}`} total={rows.length} page={table.page} pageSize={table.pageSize} onPageChange={(page) => table.patch({ page })} onPageSizeChange={(pageSize) => table.patch({ pageSize })} sortBy={table.sortBy} sortDir={table.sortDir} onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })} status={status} error={error} onRetry={() => void load()} hasActiveFilters={Object.keys(table.filters).length > 0} onClearFilters={() => table.patch({ filters: {} })} rowActions={(row) => row.trang_thai !== 'da_xu_ly' ? <IconButton aria-label="Đánh dấu đã xử lý" onClick={() => void resolve(row)}><CheckCircleIcon fontSize="small" /></IconButton> : null} />
      <ConfirmDialog isOpen={clearConfirm} message="Dọn toàn bộ cảnh báo đã xử lý?" confirmLabel="Dọn" cancelLabel="Huỷ" onConfirm={() => void clearResolved()} onCancel={() => setClearConfirm(false)} variant="danger" />
    </AdminPage>
  )
}
