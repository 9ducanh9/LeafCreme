// Admin Sales Management Page
import { useState, useEffect, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import SalesTable from '../../components/admin/sales/SalesTable'
import SalesFilters from '../../components/admin/sales/SalesFilters'
import { getOrders, deleteOrder } from '../../services/admin/salesService'
import { Order } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function AdminSalesPage() {
  const { showSuccess, showError } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })

  // Filters
  const [orderType, setOrderType] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountFrom, setAmountFrom] = useState('')
  const [amountTo, setAmountTo] = useState('')
  const [search, setSearch] = useState('')

  const loadOrders = useCallback(async () => {
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
    } catch (error) {
      showError('Không thể tải danh sách đơn hàng')
    }
  }, [amountFrom, amountTo, dateFrom, dateTo, orderType, search, showError, status])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    try {
      await deleteOrder(deleteConfirm.id)
      showSuccess('Xóa đơn hàng thành công')
      await loadOrders()
    } catch (error) {
      showError('Không thể xóa đơn hàng')
    } finally {
      setDeleteConfirm({ open: false, id: null })
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F', mb: 3 }}>
        Danh sách bán hàng
      </Typography>

      <SalesFilters
        orderType={orderType}
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        amountFrom={amountFrom}
        amountTo={amountTo}
        search={search}
        onOrderTypeChange={setOrderType}
        onStatusChange={setStatus}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onAmountFromChange={setAmountFrom}
        onAmountToChange={setAmountTo}
        onSearchChange={setSearch}
      />

      <SalesTable orders={orders} onDelete={handleDelete} />

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
