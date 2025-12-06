// Admin Pre-order Detail Page
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PreOrderDetailCard from '../../components/admin/preorders/PreOrderDetailCard'
import {
  getPreOrderById,
  updatePreOrderStatus,
  updatePreOrderNotes,
} from '../../services/admin/preOrderService'
import { PreOrder } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function AdminPreOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [preOrder, setPreOrder] = useState<PreOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesValue, setNotesValue] = useState('')

  useEffect(() => {
    if (id) {
      loadPreOrder()
    }
  }, [id])

  const loadPreOrder = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getPreOrderById(id)
      setPreOrder(data)
      setNotesValue(data.notes || '')
    } catch (error) {
      showError('Không thể tải chi tiết đặt trước')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (status: PreOrder['status']) => {
    if (!id || !preOrder) return
    try {
      await updatePreOrderStatus(id, status)
      setPreOrder({ ...preOrder, status })
      showSuccess('Cập nhật trạng thái thành công')
    } catch (error) {
      showError('Không thể cập nhật trạng thái')
    }
  }

  const handleNotesChange = (notes: string) => {
    setNotesValue(notes)
    setNotesEditing(true)
  }

  const handleSaveNotes = async () => {
    if (!id) return
    try {
      await updatePreOrderNotes(id, notesValue)
      if (preOrder) {
        setPreOrder({ ...preOrder, notes: notesValue })
      }
      setNotesEditing(false)
      showSuccess('Cập nhật ghi chú thành công')
    } catch (error) {
      showError('Không thể cập nhật ghi chú')
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LoadingSpinner size="lg" />
      </Box>
    )
  }

  if (!preOrder) {
    return (
      <Box>
        <Typography variant="h6" sx={{ color: '#7A6F63' }}>
          Không tìm thấy đặt trước
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/preorders')}
        sx={{ mb: 3, color: '#7A6F63' }}
      >
        Quay lại danh sách đặt trước
      </Button>

      <PreOrderDetailCard
        preOrder={preOrder}
        onStatusChange={handleStatusChange}
        onNotesChange={handleNotesChange}
        onSaveNotes={handleSaveNotes}
        notesEditing={notesEditing}
        notesValue={notesValue}
      />
    </Box>
  )
}

