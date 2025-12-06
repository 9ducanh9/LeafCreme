// Admin Sales Detail Page
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SalesDetailCard from '../../components/admin/sales/SalesDetailCard'
import { getOrderById, updateOrderStatus } from '../../services/admin/salesService'
import { Order } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function AdminSalesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadOrder()
    }
  }, [id])

  const loadOrder = async () => {
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
  }

  const handleStatusChange = async (status: Order['status']) => {
    if (!id || !order) return
    try {
      await updateOrderStatus(id, status)
      setOrder({ ...order, status })
      showSuccess('Cập nhật trạng thái thành công')
    } catch (error) {
      showError('Không thể cập nhật trạng thái')
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
        <Typography variant="h6" sx={{ color: '#7A6F63' }}>
          Không tìm thấy đơn hàng
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/sales')}
        sx={{ mb: 3, color: '#7A6F63' }}
      >
        Quay lại danh sách bán hàng
      </Button>

      <SalesDetailCard order={order} onStatusChange={handleStatusChange} />
    </Box>
  )
}

