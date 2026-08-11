import { useCallback, useEffect, useState } from 'react'
import { MenuItem, Tab, Tabs, TextField } from '@mui/material'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar from '../../components/admin/ui/data-table-toolbar'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import { getBatchPage, type BatchListKind, type BatchPageItem } from '../../services/admin/batchService'

const tabs: Array<{ kind: BatchListKind; label: string }> = [
  { kind: 'products', label: 'Sản phẩm' },
  { kind: 'components', label: 'Linh kiện' },
  { kind: 'gift-boxes', label: 'Hộp quà' },
]

const columns: Column<BatchPageItem>[] = [
  { id: 'ma_lo', label: 'Mã lô', sortable: true },
  { id: 'lohang_id', label: 'Mã hệ thống', numeric: true, sortable: true },
  { id: 'ngay_nhap', label: 'Ngày nhập', sortable: true, render: (row) => new Date(row.ngay_nhap).toLocaleDateString('vi-VN') },
  { id: 'ngay_het_han', label: 'Hạn dùng', sortable: true, render: (row) => new Date(row.ngay_het_han).toLocaleDateString('vi-VN') },
  { id: 'so_luong', label: 'Nhập', numeric: true },
  { id: 'so_luong_hien_tai', label: 'Tồn hiện tại', numeric: true, sortable: true, render: (row) => row.so_luong_hien_tai ?? 0 },
  { id: 'trang_thai', label: 'Trạng thái' },
]

export default function AdminInventoryPage() {
  const table = useDataTableState({ key: 'inventory', defaultSortBy: 'ngay_het_han', defaultSortDir: 'asc', defaultPageSize: 50, filterKeys: ['search', 'trang_thai'] })
  const [activeTab, setActiveTab] = useState(0)
  const [rows, setRows] = useState<BatchPageItem[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

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

  return (
    <AdminPage title="Tồn kho" breadcrumb={[{ label: 'Tồn kho' }]}>
      <Tabs value={activeTab} onChange={(_, value) => { setActiveTab(value); table.patch({ page: 0 }) }} aria-label="Nhóm tồn kho">
        {tabs.map((tab) => <Tab key={tab.kind} label={tab.label} />)}
      </Tabs>
      <DataTableToolbar title="Các lô hàng đang quản lý" onClear={hasFilters ? () => table.patch({ filters: {} }) : undefined}>
        <TextField size="small" label="Tìm theo mã lô" value={table.filters.search || ''} onChange={(event) => updateFilter('search', event.target.value)} />
        <TextField select size="small" label="Trạng thái" value={table.filters.trang_thai || ''} onChange={(event) => updateFilter('trang_thai', event.target.value)}>
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
      />
    </AdminPage>
  )
}
