import { useCallback, useEffect, useState } from 'react'
import { Button, Chip, MenuItem, Tab, Tabs, TextField } from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar, { ADMIN_SEARCH_FIELD_ID } from '../../components/admin/ui/data-table-toolbar'
import ExpiryCell from '../../components/admin/ui/expiry-cell'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import { useDebouncedCallback } from '../../hooks/admin/useDebouncedCallback'
import { getBatchPage, type BatchListKind, type BatchPageItem } from '../../services/admin/batchService'
import { downloadCsv } from '../../utils/admin/exportCsv'

const tabs: Array<{ kind: BatchListKind; label: string }> = [
  { kind: 'products', label: 'Sản phẩm' },
  { kind: 'components', label: 'Linh kiện' },
  { kind: 'gift-boxes', label: 'Hộp quà' },
]

const BATCH_STATUS: Record<string, { label: string; color: 'success' | 'default' | 'warning' | 'error' }> = {
  hoatdong: { label: 'Hoạt động', color: 'success' },
  tamdung: { label: 'Tạm dừng', color: 'warning' },
  hethan: { label: 'Hết hạn', color: 'error' },
  daxuathet: { label: 'Đã xuất hết', color: 'default' },
}

const columns: Column<BatchPageItem>[] = [
  { id: 'ma_lo', label: 'Mã lô', sortable: true },
  { id: 'lohang_id', label: 'Mã hệ thống', numeric: true, sortable: true },
  { id: 'ngay_nhap', label: 'Ngày nhập', sortable: true, render: (row) => new Date(row.ngay_nhap).toLocaleDateString('vi-VN') },
  { id: 'ngay_het_han', label: 'Hạn dùng', sortable: true, render: (row) => <ExpiryCell date={row.ngay_het_han} /> },
  { id: 'so_luong', label: 'Nhập', numeric: true },
  { id: 'so_luong_hien_tai', label: 'Tồn hiện tại', numeric: true, sortable: true, render: (row) => row.so_luong_hien_tai ?? 0 },
  {
    id: 'trang_thai', label: 'Trạng thái',
    render: (row) => {
      const meta = BATCH_STATUS[row.trang_thai]
      return <Chip size="small" variant="outlined" label={meta?.label ?? row.trang_thai} color={meta?.color} />
    },
  },
]

export default function AdminInventoryPage() {
  const table = useDataTableState({ key: 'inventory', defaultSortBy: 'ngay_het_han', defaultSortDir: 'asc', defaultPageSize: 50, filterKeys: ['search', 'trang_thai'] })
  const [activeTab, setActiveTab] = useState(0)
  const [rows, setRows] = useState<BatchPageItem[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const filtersKey = JSON.stringify(table.filters)
  // Selection reset khi đổi filter/sort/tab — chọn 5 dòng rồi đổi filter mà vẫn
  // giữ selection thì thao tác hàng loạt sẽ chạy trên dữ liệu người dùng không còn thấy.
  useEffect(() => { setSelected(new Set()) }, [activeTab, table.sortBy, table.sortDir, filtersKey])

  const loadInventory = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const page = await getBatchPage(tabs[activeTab].kind, {
        skip: table.skip,
        limit: table.pageSize,
        sort_by: table.sortBy,
        sort_dir: table.sortDir,
        search: table.filters.search,
        trang_thai: table.filters.trang_thai,
      })
      setRows(page.items)
      setTotal(page.total)
      setStatus('idle')
    } catch {
      setError('Không thể tải dữ liệu tồn kho')
      setStatus('error')
    }
  }, [activeTab, table.filters, table.pageSize, table.skip, table.sortBy, table.sortDir])

  useEffect(() => { void loadInventory() }, [loadInventory])
  const updateFilter = (name: string, value: string) => table.patch({ filters: { ...table.filters, [name]: value } })
  const hasFilters = Object.keys(table.filters).length > 0
  const [localSearch, setLocalSearch] = useState(table.filters.search || '')
  useEffect(() => { setLocalSearch(table.filters.search || '') }, [table.filters.search])
  const debouncedSearch = useDebouncedCallback((value: string) => updateFilter('search', value), 400)

  const exportSelected = () => {
    const selectedRows = rows.filter((row) => selected.has(row.lohang_id))
    downloadCsv(
      `ton-kho-${tabs[activeTab].kind}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Mã lô', 'Mã hệ thống', 'Ngày nhập', 'Hạn dùng', 'Số lượng nhập', 'Tồn hiện tại', 'Trạng thái'],
      selectedRows.map((row) => [row.ma_lo, row.lohang_id, row.ngay_nhap, row.ngay_het_han, row.so_luong, row.so_luong_hien_tai ?? 0, row.trang_thai]),
    )
  }

  return (
    <AdminPage title="Tồn kho" breadcrumb={[{ label: 'Tồn kho' }]}>
      <Tabs value={activeTab} onChange={(_, value) => { setActiveTab(value); table.patch({ page: 0 }) }} aria-label="Nhóm tồn kho">
        {tabs.map((tab) => <Tab key={tab.kind} label={tab.label} />)}
      </Tabs>
      <DataTableToolbar title="Các lô hàng đang quản lý" onClear={hasFilters ? () => table.patch({ filters: {} }) : undefined}>
        <TextField id={ADMIN_SEARCH_FIELD_ID} size="small" label="Tìm theo mã lô" value={localSearch} onChange={(event) => { setLocalSearch(event.target.value); debouncedSearch(event.target.value) }} />
        <TextField select size="small" label="Trạng thái" value={table.filters.trang_thai || ''} onChange={(event) => updateFilter('trang_thai', event.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="hoatdong">Hoạt động</MenuItem>
          <MenuItem value="tamdung">Tạm dừng</MenuItem>
          <MenuItem value="hethan">Hết hạn</MenuItem>
          <MenuItem value="daxuathet">Đã xuất hết</MenuItem>
        </TextField>
      </DataTableToolbar>
      <DataTable
        caption={`Danh sách lô ${tabs[activeTab].label.toLowerCase()}`}
        columns={columns}
        rows={rows}
        getRowId={(row) => row.lohang_id}
        getRowLabel={(row) => row.ma_lo}
        total={total}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={(page) => table.patch({ page })}
        onPageSizeChange={(pageSize) => table.patch({ pageSize })}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })}
        status={status}
        error={error}
        onRetry={() => void loadInventory()}
        hasActiveFilters={hasFilters}
        onClearFilters={() => table.patch({ filters: {} })}
        selectedIds={selected}
        onSelectionChange={setSelected}
        bulkActions={<Button size="small" startIcon={<FileDownloadIcon />} onClick={exportSelected}>Xuất CSV</Button>}
        // Lô hàng phải audit được — không có bulk delete ở bảng này (spec 10 §4.4).
      />
    </AdminPage>
  )
}
