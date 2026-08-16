// Admin Orders Page — gộp "Đơn đặt trước" + "Bán tại quầy" (đều là cùng một
// tài nguyên /orders, chỉ khác loai_don) thành một trang, cộng thêm luồng
// tạo đơn thủ công (khách nhắn tin đặt / mua trực tiếp) mà trước đây không
// có UI nào gọi tới dù backend đã hỗ trợ sẵn.
import { useCallback, useEffect, useState } from 'react'
import { Box, Button, Tabs, Tab, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import OrdersTable from '../../components/admin/orders/OrdersTable'
import OrdersFilters from '../../components/admin/orders/OrdersFilters'
import ManualOrderForm from '../../components/admin/orders/ManualOrderForm'
import { getOrders, deleteOrder } from '../../services/admin/adminOrderService'
import type { Order, OrderStatus, OrderType } from '../../types/admin'
import { ORDER_TYPE_LABEL } from '../../config/orderLabels'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const TABS: Array<{ value: OrderType | ''; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'online', label: ORDER_TYPE_LABEL.online },
  { value: 'dat_truoc', label: ORDER_TYPE_LABEL.dat_truoc },
  { value: 'pos', label: ORDER_TYPE_LABEL.pos },
]

export default function AdminOrdersPage() {
  const { showSuccess, showError } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [tableStatus, setTableStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const [orderType, setOrderType] = useState<OrderType | ''>('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountFrom, setAmountFrom] = useState('')
  const [amountTo, setAmountTo] = useState('')
  const [search, setSearch] = useState('')

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
      })
      setOrders(data)
      setTableStatus('idle')
    } catch (error) {
      showError('Không thể tải danh sách đơn hàng')
      setTableStatus('error')
    }
  }, [orderType, status, dateFrom, dateTo, amountFrom, amountTo, search, showError])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleDelete = (id: string) => setDeleteConfirm({ open: true, id })

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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Đơn hàng</Typography>
          <Typography variant="body2" color="text.secondary">Gộp đơn trực tuyến, đặt trước và đơn tạo thủ công vào một chỗ.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
          Tạo đơn thủ công
        </Button>
      </Box>

      <Tabs value={orderType} onChange={(_, value) => setOrderType(value)} sx={{ mb: 2, mt: 2 }}>
        {TABS.map((tab) => <Tab key={tab.value || 'all'} value={tab.value} label={tab.label} />)}
      </Tabs>

      <OrdersFilters
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        amountFrom={amountFrom}
        amountTo={amountTo}
        search={search}
        onStatusChange={setStatus}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onAmountFromChange={setAmountFrom}
        onAmountToChange={setAmountTo}
        onSearchChange={setSearch}
      />

      <OrdersTable orders={orders} status={tableStatus} onDelete={handleDelete} />

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
    </Box>
  )
}
