// Admin Pre-order Management Page
import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import PreOrderTable from '../../components/admin/preorders/PreOrderTable'
import PreOrderFilters from '../../components/admin/preorders/PreOrderFilters'
import { getPreOrders, deletePreOrder } from '../../services/admin/preOrderService'
import { PreOrder } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function AdminPreOrderPage() {
  const { showSuccess, showError } = useToast()
  const [preOrders, setPreOrders] = useState<PreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })

  // Filters
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPreOrders()
  }, [status, dateFrom, dateTo, search])

  const loadPreOrders = async () => {
    setLoading(true)
    try {
      const data = await getPreOrders({
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
      })
      setPreOrders(data)
    } catch (error) {
      showError('Không thể tải danh sách đặt trước')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    try {
      await deletePreOrder(deleteConfirm.id)
      showSuccess('Xóa đặt trước thành công')
      await loadPreOrders()
    } catch (error) {
      showError('Không thể xóa đặt trước')
    } finally {
      setDeleteConfirm({ open: false, id: null })
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: 'Playfair Display, serif', color: '#473C2F', mb: 3 }}>
        Quản lý đặt trước
      </Typography>

      <PreOrderFilters
        status={status}
        dateFrom={dateFrom}
        dateTo={dateTo}
        search={search}
        onStatusChange={setStatus}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSearchChange={setSearch}
      />

      <PreOrderTable preOrders={preOrders} onDelete={handleDelete} />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        message="Bạn có chắc chắn muốn xóa đặt trước này?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        variant="danger"
      />
    </Box>
  )
}

