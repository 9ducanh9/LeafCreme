// Admin Order Detail Page
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import OrderDetailCard from '../../components/admin/orders/OrderDetailCard'
import { getOrderById, updateOrderStatus, cancelOrder } from '../../services/admin/adminOrderService'
import type { Order, OrderStatus } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const loadOrder = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getOrderById(id)
      setOrder(data)
    } catch (error) {
      showError('Không thể tải chi tiết đơn hàng')
    } finally {
      setLoading(false)
    }
  }, [id, showError])

  useEffect(() => {
    if (id) loadOrder()
  }, [id, loadOrder])

  const handleStatusChange = async (status: OrderStatus) => {
    if (!id) return
    try {
      const updated = await updateOrderStatus(id, status)
      setOrder(updated)
      showSuccess('Cập nhật trạng thái thành công')
    } catch (error) {
      showError('Không thể cập nhật trạng thái')
    }
  }

  const handleCancel = async (reason: string) => {
    if (!id) return
    try {
      const updated = await cancelOrder(id, reason)
      setOrder(updated)
      showSuccess('Đã hủy đơn hàng')
    } catch (error) {
      showError('Không thể hủy đơn hàng')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </Box>
    )
  }

  if (!order) {
    return (
      <Box>
        <Typography variant="h6" color="text.secondary">Không tìm thấy đơn hàng</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/orders')} sx={{ mb: 3 }}>
        Quay lại danh sách đơn hàng
      </Button>

      <OrderDetailCard order={order} onStatusChange={handleStatusChange} onCancel={handleCancel} />
    </Box>
  )
}
