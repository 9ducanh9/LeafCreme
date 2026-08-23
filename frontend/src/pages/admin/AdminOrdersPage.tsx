// Admin Orders Page — gộp "Đơn đặt trước" + "Bán tại quầy" (đều là cùng một
// tài nguyên /orders, chỉ khác loai_don) thành một trang, cộng thêm luồng
// tạo đơn thủ công (khách nhắn tin đặt / mua trực tiếp) mà trước đây không
// có UI nào gọi tới dù backend đã hỗ trợ sẵn.
import { useCallback, useEffect, useState } from 'react'
import { Button, Tabs, Tab, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import AdminPage from '../../components/admin/ui/admin-page'
import OrdersTable from '../../components/admin/orders/OrdersTable'
import OrdersFilters from '../../components/admin/orders/OrdersFilters'
import ManualOrderForm from '../../components/admin/orders/ManualOrderForm'
import { getOrders, deleteOrder } from '../../services/admin/adminOrderService'
import type { Order, OrderStatus, OrderType } from '../../types/admin'
import { ORDER_TYPE_LABEL } from '../../config/orderLabels'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../contexts/AuthContext'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import { downloadCsv } from '../../utils/admin/exportCsv'
import { formatPrice } from '../../utils/formatPrice'

const TABS: Array<{ value: OrderType | ''; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'online', label: ORDER_TYPE_LABEL.online },
  { value: 'dat_truoc', label: ORDER_TYPE_LABEL.dat_truoc },
  { value: 'pos', label: ORDER_TYPE_LABEL.pos },
]

export default function AdminOrdersPage() {
  const { showSuccess, showError } = useToast()
  const { can } = useAuth()
  const table = useDataTableState({
    key: 'orders', defaultSortBy: 'ngay_tao', defaultSortDir: 'desc', defaultPageSize: 50,
    filterKeys: ['orderType', 'status', 'dateFrom', 'dateTo', 'amountFrom', 'amountTo', 'search'],
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [tableStatus, setTableStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  // Filters — vào URL qua table.filters (spec 10 §5)
  const {
    orderType = '', status = '', dateFrom = '', dateTo = '', amountFrom = '', amountTo = '', search = '',
  } = table.filters as Record<string, string> & { orderType?: OrderType | ''; status?: OrderStatus | '' }
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const filtersKey = JSON.stringify(table.filters)
  useEffect(() => { setSelected(new Set()) }, [table.sortBy, table.sortDir, filtersKey])

  const loadOrders = useCallback(async () => {
    setTableStatus('loading')
    try {
      const data = await getOrders({
        orderType: orderType || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        amountFrom: amountFrom ? Number(amountFrom) : undefined,
        amountTo: amountTo ? Number(amountTo) : undefined,
        search: search || undefined,
        skip: table.skip,
        limit: table.pageSize,
        sort_by: table.sortBy,
        sort_dir: table.sortDir,
      })
      setOrders(data.items); setTotal(data.total)
      setTableStatus('idle')
    } catch (error) {
      showError('Không thể tải danh sách đơn hàng')
      setTableStatus('error')
    }
  }, [amountFrom, amountTo, dateFrom, dateTo, orderType, search, showError, status, table.pageSize, table.skip, table.sortBy, table.sortDir])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleDelete = (id: string) => setDeleteConfirm({ open: true, id })

  const exportSelected = () => {
    const rows = orders.filter((o) => selected.has(o.id))
    downloadCsv(
      `don-hang-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Mã đơn', 'Loại', 'Khách hàng', 'SĐT', 'Tổng tiền', 'Trạng thái', 'Ngày giao/lấy', 'Ngày tạo'],
      rows.map((o) => [o.orderCode, o.orderType, o.customerName, o.phone, formatPrice(o.totalAmount), o.status, o.expectedDate || '', o.date]),
    )
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    try {
      await deleteOrder(deleteConfirm.id)
      showSuccess('Xóa đơn hàng thành công')
      await loadOrders()
    } catch (error) {
      showError('Không thể xóa đơn hàng — đơn có thể đã có lịch sử kho, hãy dùng hủy đơn thay vì xoá')
    } finally {
      setDeleteConfirm({ open: false, id: null })
    }
  }

  return (
    <AdminPage
      title="Đơn hàng"
      breadcrumb={[{ label: 'Đơn hàng' }]}
      actions={can('orders.pos.create') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>Tạo đơn thủ công</Button>}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Gộp đơn trực tuyến, đặt trước và đơn tạo thủ công vào một chỗ.</Typography>

      <Tabs value={orderType} onChange={(_, value) => table.patch({ filters: { ...table.filters, orderType: value } })} sx={{ mb: 2 }}>
        {TABS.map((tab) => <Tab key={tab.value || 'all'} value={tab.value} label={tab.label} />)}
      </Tabs>

      <OrdersFilters
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        amountFrom={amountFrom}
        amountTo={amountTo}
        search={search}
        onStatusChange={(value) => table.patch({ filters: { ...table.filters, status: value } })}
        onDateFromChange={(value) => table.patch({ filters: { ...table.filters, dateFrom: value } })}
        onDateToChange={(value) => table.patch({ filters: { ...table.filters, dateTo: value } })}
        onAmountFromChange={(value) => table.patch({ filters: { ...table.filters, amountFrom: value } })}
        onAmountToChange={(value) => table.patch({ filters: { ...table.filters, amountTo: value } })}
        onSearchChange={(value) => table.patch({ filters: { ...table.filters, search: value } })}
      />

      <OrdersTable
        orders={orders} status={tableStatus} onDelete={handleDelete} canDelete={can('orders.delete')} total={total} page={table.page} pageSize={table.pageSize}
        onPageChange={(page) => table.patch({ page })} onPageSizeChange={(pageSize) => table.patch({ pageSize })}
        sortBy={table.sortBy} sortDir={table.sortDir} onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })}
        selectedIds={selected} onSelectionChange={setSelected}
        bulkActions={<Button size="small" startIcon={<FileDownloadIcon />} onClick={exportSelected}>Xuất CSV</Button>}
      />

      <ManualOrderForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={() => loadOrders()}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        message="Bạn có chắc chắn muốn xóa đơn hàng này?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        variant="danger"
      />
    </AdminPage>
  )
}
