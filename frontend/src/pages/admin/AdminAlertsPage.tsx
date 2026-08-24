import { useCallback, useEffect, useState } from 'react'
import { Alert as MuiAlert, Button, Chip, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import RefreshIcon from '@mui/icons-material/Refresh'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar from '../../components/admin/ui/data-table-toolbar'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import { useAuth } from '../../contexts/AuthContext'
import {
  clearResolvedAlerts, getAlerts, getAlertsSummary, getAlertTypeLabel, getSeverityLabel, getStatusLabel, updateAlert,
  type Alert as AlertRow, type AlertSummary,
} from '../../services/admin/alertService'

// Ba mức độ, ba cách hiển thị. Trước đây `cao ? 'error' : 'warning'` gộp
// 'binh_thuong' và 'thap' vào cùng một màu vàng, nên "Thấp" trông khẩn cấp
// ngang "Bình thường".
const SEVERITY_STYLE: Record<AlertRow['muc_do_nghiem_trong'], { color: 'error' | 'warning' | 'default'; variant: 'filled' | 'outlined' }> = {
  cao: { color: 'error', variant: 'filled' },
  binh_thuong: { color: 'warning', variant: 'filled' },
  thap: { color: 'default', variant: 'outlined' },
}

const STATUS_STYLE: Record<AlertRow['trang_thai'], 'warning' | 'info' | 'success' | 'default'> = {
  chua_xu_ly: 'warning',
  dang_xu_ly: 'info',
  da_xu_ly: 'success',
  bo_qua: 'default',
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.round(hours / 24)} ngày trước`
}

/** Số ngày còn lại tới hạn dùng. Âm nghĩa là đã quá hạn. */
function daysUntilExpiry(iso?: string): number | null {
  if (!iso) return null
  const value = new Date(iso).getTime()
  if (Number.isNaN(value)) return null
  return Math.ceil((value - Date.now()) / 86_400_000)
}

const columns: Column<AlertRow>[] = [
  {
    id: 'ngay_canh_bao', label: 'Thời gian', sortable: true,
    // Thời gian tương đối để triage nhanh; mốc tuyệt đối giữ ở tooltip.
    render: (row) => (
      <Tooltip title={new Date(row.ngay_canh_bao).toLocaleString('vi-VN')}>
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{relativeTime(row.ngay_canh_bao)}</Typography>
      </Tooltip>
    ),
  },
  {
    id: 'loai_canh_bao', label: 'Loại',
    render: (row) => (
      <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'nowrap' }}>{getAlertTypeLabel(row.loai_canh_bao)}</Typography>
    ),
  },
  {
    // `id` phải là 'muc_do' — đó là key duy nhất backend nhận cho cột này
    // (alert_service.list_alerts sort_map). Trước đây để
    // 'muc_do_nghiem_trong', không khớp map nên bấm sort âm thầm rơi về
    // sắp theo ngày. Enum khai ('thap','binh_thuong','cao') nên desc =
    // nặng nhất trước.
    id: 'muc_do', label: 'Mức độ', sortable: true,
    render: (row) => {
      const style = SEVERITY_STYLE[row.muc_do_nghiem_trong] ?? SEVERITY_STYLE.thap
      return <Chip size="small" label={getSeverityLabel(row.muc_do_nghiem_trong)} color={style.color} variant={style.variant} />
    },
  },
  {
    // Tên sản phẩm và mã lô là hai định danh khác nhau; `a || b` làm mất mã
    // lô mỗi khi có tên, trong khi truy vết lô cần cả hai.
    id: 'ten_san_pham', label: 'Đối tượng',
    render: (row) => (
      <Stack spacing={0.25}>
        <Typography variant="body2" fontWeight={500}>{row.ten_san_pham || '—'}</Typography>
        {row.ma_lo && <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{row.ma_lo}</Typography>}
      </Stack>
    ),
  },
  {
    // `ngay_het_han` vẫn luôn có trong payload nhưng trước đây không hiển
    // thị — với tiệm bánh đây là con số quyết định nhất.
    id: 'ngay_het_han', label: 'Hạn dùng',
    render: (row) => {
      const days = daysUntilExpiry(row.ngay_het_han)
      if (days === null) return <Typography variant="body2" color="text.disabled">—</Typography>
      const label = days < 0 ? `Quá hạn ${Math.abs(days)} ngày` : days === 0 ? 'Hết hạn hôm nay' : `Còn ${days} ngày`
      if (days <= 0) return <Chip size="small" color="error" label={label} />
      if (days <= 3) return <Chip size="small" color="warning" variant="outlined" label={label} />
      return <Typography variant="body2">{label}</Typography>
    },
  },
  { id: 'so_luong_hien_tai', label: 'Tồn hiện tại', numeric: true, render: (row) => row.so_luong_hien_tai ?? '—' },
  {
    id: 'trang_thai', label: 'Trạng thái',
    // 'chua_xu_ly' đúng với gần như mọi dòng, nên tô nó thành chip là dành
    // trọng số thị giác lớn nhất cho thông tin ít nhất. Chỉ nhấn khi trạng
    // thái KHÁC mặc định; còn lại để chữ mờ.
    render: (row) => (
      row.trang_thai === 'chua_xu_ly'
        ? <Typography variant="caption" color="text.disabled">{getStatusLabel(row.trang_thai)}</Typography>
        : <Chip size="small" variant="outlined" color={STATUS_STYLE[row.trang_thai] ?? 'default'} label={getStatusLabel(row.trang_thai)} />
    ),
  },
]

function SummaryTiles({ summary }: { summary: AlertSummary }) {
  const high = summary.by_severity?.cao ?? 0
  const tiles: { label: string; value: number; tone: 'danger' | 'warn' | 'muted' }[] = [
    { label: 'Chờ xử lý', value: summary.pending, tone: summary.pending > 0 ? 'warn' : 'muted' },
    { label: 'Mức cao', value: high, tone: high > 0 ? 'danger' : 'muted' },
    { label: 'Đang xử lý', value: summary.processing, tone: 'muted' },
    { label: 'Đã xử lý', value: summary.resolved, tone: 'muted' },
  ]
  const toneColor = { danger: 'error.main', warn: 'warning.main', muted: 'text.primary' } as const
  return (
    <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
      {tiles.map((tile) => (
        <Paper
          key={tile.label}
          variant="outlined"
          sx={{ px: 2.5, py: 1.25, minWidth: 116, borderRadius: 2 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {tile.label}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.25, fontWeight: 700, lineHeight: 1.1, color: toneColor[tile.tone] }}>
            {tile.value}
          </Typography>
        </Paper>
      ))}
    </Stack>
  )
}

export default function AdminAlertsPage() {
  const { can } = useAuth()
  // Đây là hàng đợi xử lý, không phải feed tin tức: mặc định nặng nhất
  // trước. Khớp luôn với thứ tự backend tự dùng ở nhánh không phân trang
  // (muc_do desc, rồi ngay_canh_bao desc).
  const table = useDataTableState({ key: 'alerts', defaultSortBy: 'muc_do', defaultSortDir: 'desc', defaultPageSize: 50, filterKeys: ['muc_do', 'trang_thai'] })
  const [rows, setRows] = useState<AlertRow[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const filtersKey = JSON.stringify(table.filters)
  useEffect(() => { setSelected(new Set()) }, [table.sortBy, table.sortDir, filtersKey])

  const load = useCallback(async () => {
    setStatus('loading'); setError(null)
    try {
      const [alerts, nextSummary] = await Promise.all([
        getAlerts({ muc_do: table.filters.muc_do, trang_thai: table.filters.trang_thai, skip: table.skip, limit: table.pageSize, sort_by: table.sortBy, sort_dir: table.sortDir }),
        getAlertsSummary(),
      ])
      setRows(alerts.items); setTotal(alerts.total); setSummary(nextSummary); setStatus('idle')
    } catch { setError('Không thể tải dữ liệu cảnh báo'); setStatus('error') }
  }, [table.filters, table.pageSize, table.skip, table.sortBy, table.sortDir])
  useEffect(() => { void load() }, [load])

  const setFilter = (name: string, value: string) => table.patch({ filters: { ...table.filters, [name]: value } })
  const resolve = async (row: AlertRow) => { try { await updateAlert(row.canhbao_id, { trang_thai: 'da_xu_ly' }); await load() } catch { setError('Không thể cập nhật cảnh báo') } }
  const clearResolved = async () => { try { await clearResolvedAlerts(); setClearConfirm(false); await load() } catch { setError('Không thể dọn cảnh báo đã xử lý') } }

  // Đánh dấu đã xử lý hàng loạt — gọi lại đúng endpoint từng-dòng, không có
  // endpoint bulk riêng (giống bulk approve/reject ở AdminAgentPage).
  const bulkResolve = async () => {
    const targets = rows.filter((row) => selected.has(row.canhbao_id) && row.trang_thai !== 'da_xu_ly')
    if (targets.length === 0) return
    setBulkBusy(true)
    try {
      const results = await Promise.allSettled(targets.map((row) => updateAlert(row.canhbao_id, { trang_thai: 'da_xu_ly' })))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) setError(`Đánh dấu hàng loạt: ${failed}/${targets.length} cảnh báo thất bại`)
      setSelected(new Set())
      await load()
    } finally {
      setBulkBusy(false)
    }
  }
  const hasResolvableSelection = rows.some((row) => selected.has(row.canhbao_id) && row.trang_thai !== 'da_xu_ly')

  return (
    <AdminPage title="Cảnh báo tồn kho" breadcrumb={[{ label: 'Cảnh báo' }]}>
      {summary && <SummaryTiles summary={summary} />}
      {/* Lỗi tải bảng đã được DataTable hiển thị kèm nút thử lại; chỉ hiện ở
          đây những lỗi thao tác (cập nhật, dọn, đánh dấu hàng loạt) mà bảng
          không biết tới — trước đây cả hai cùng hiện nên lỗi tải bị lặp. */}
      {error && status !== 'error' && <MuiAlert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</MuiAlert>}
      <DataTableToolbar title="Theo dõi cảnh báo" actions={<><Button startIcon={<RefreshIcon />} onClick={() => void load()}>Làm mới</Button>{can('alerts.delete') && <Button startIcon={<DeleteSweepIcon />} color="warning" onClick={() => setClearConfirm(true)}>Dọn đã xử lý</Button>}</>}>
        <TextField select size="small" label="Mức độ" value={table.filters.muc_do || ''} onChange={(event) => setFilter('muc_do', event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="cao">Cao</MenuItem><MenuItem value="binh_thuong">Bình thường</MenuItem><MenuItem value="thap">Thấp</MenuItem></TextField>
        <TextField select size="small" label="Trạng thái" value={table.filters.trang_thai || ''} onChange={(event) => setFilter('trang_thai', event.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="chua_xu_ly">Chưa xử lý</MenuItem><MenuItem value="dang_xu_ly">Đang xử lý</MenuItem><MenuItem value="da_xu_ly">Đã xử lý</MenuItem></TextField>
      </DataTableToolbar>
      <DataTable
        caption="Danh sách cảnh báo tồn kho" columns={columns} rows={rows} getRowId={(row) => row.canhbao_id}
        getRowLabel={(row) => row.ten_san_pham || `Cảnh báo #${row.canhbao_id}`} total={total} page={table.page} pageSize={table.pageSize}
        onPageChange={(page) => table.patch({ page })} onPageSizeChange={(pageSize) => table.patch({ pageSize })}
        sortBy={table.sortBy} sortDir={table.sortDir} onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })}
        status={status} error={status === 'error' ? error : null} onRetry={() => void load()} hasActiveFilters={Object.values(table.filters).some(Boolean)}
        onClearFilters={() => table.patch({ filters: {} })}
        selectedIds={can('alerts.update') ? selected : undefined}
        onSelectionChange={can('alerts.update') ? setSelected : undefined}
        bulkActions={<Button size="small" startIcon={<CheckCircleIcon />} disabled={bulkBusy || !hasResolvableSelection} onClick={() => void bulkResolve()}>Đánh dấu đã xử lý</Button>}
        rowActions={(row) => can('alerts.update') && row.trang_thai !== 'da_xu_ly' ? <IconButton aria-label="Đánh dấu đã xử lý" onClick={() => void resolve(row)}><CheckCircleIcon fontSize="small" /></IconButton> : null}
      />
      <ConfirmDialog isOpen={clearConfirm} message="Dọn toàn bộ cảnh báo đã xử lý?" confirmLabel="Dọn" cancelLabel="Huỷ" onConfirm={() => void clearResolved()} onCancel={() => setClearConfirm(false)} variant="danger" />
    </AdminPage>
  )
}
