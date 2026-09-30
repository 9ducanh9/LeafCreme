// Admin Order Detail Page
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AdminPage from '../../components/admin/ui/admin-page'
import OrderDetailCard from '../../components/admin/orders/OrderDetailCard'
import { getOrderById, updateOrderStatus, cancelOrder } from '../../services/admin/adminOrderService'
import type { Order, OrderStatus } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { createSePayPayment, getOrderPayments, recordCashPayment, type PaymentStatus } from '../../services/paymentService'

function apiErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'detail' in error) {
    const detail = (error as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((item) => typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)).join(', ')
  }
  return fallback
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [payments, setPayments] = useState<PaymentStatus[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrder = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [orderData, paymentData] = await Promise.all([getOrderById(id), getOrderPayments(Number(id))])
      setOrder(orderData)
      setPayments(paymentData)
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
      showError(apiErrorMessage(error, 'Không thể cập nhật trạng thái'))
    }
  }

  const handleCancel = async (reason: string) => {
    if (!id) return
    try {
      const updated = await cancelOrder(id, reason)
      setOrder(updated)
      showSuccess('Đã hủy đơn hàng')
    } catch (error) {
      showError(apiErrorMessage(error, 'Không thể hủy đơn hàng'))
    }
  }

  const handleRecordCash = async (amount: number): Promise<boolean> => {
    if (!id) return false
    try {
      await recordCashPayment(Number(id), amount)
      showSuccess('Đã ghi nhận khoản tiền mặt thực nhận')
      await loadOrder()
      return true
    } catch (error) {
      showError(apiErrorMessage(error, 'Không thể ghi nhận khoản tiền mặt'))
      return false
    }
  }

  const handleCreateSePay = async () => {
    if (!id) return
    try {
      const paymentInfo = await createSePayPayment(Number(id))
      navigate(`/orders/${id}/payment-qr`, { state: { paymentInfo, adminReturn: true } })
    } catch (error) {
      showError(apiErrorMessage(error, 'Không thể tạo QR SePay'))
    }
  }

  const title = order ? `Đơn hàng ${order.orderCode}` : 'Chi tiết đơn hàng'
  const breadcrumb = [{ label: 'Đơn hàng', to: '/admin/orders' }, { label: order?.orderCode || '...' }]

  return (
    <AdminPage title={title} breadcrumb={breadcrumb}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/orders')} sx={{ mb: 3 }}>
        Quay lại danh sách đơn hàng
      </Button>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <LoadingSpinner size="lg" />
        </Box>
      ) : !order ? (
        <Typography variant="h6" color="text.secondary">Không tìm thấy đơn hàng</Typography>
      ) : (
        <OrderDetailCard
          order={order}
          payments={payments}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
          onRecordCash={handleRecordCash}
          onCreateSePay={handleCreateSePay}
        />
      )}
    </AdminPage>
  )
}
