// Admin Voucher Management Page
import { useState, useEffect, useCallback } from 'react'
import { Alert, Box, Button, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import VoucherTable from '../../components/admin/vouchers/VoucherTable'
import VoucherFilters from '../../components/admin/vouchers/VoucherFilters'
import VoucherForm from '../../components/admin/vouchers/VoucherForm'
import {
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  DEMO_VOUCHER_MODE_ENABLED,
} from '../../services/admin/voucherService'
import { Voucher } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function AdminVoucherPage() {
  const { showSuccess, showError } = useToast()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })

  // Filters
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')

  const loadVouchers = useCallback(async () => {
    if (!DEMO_VOUCHER_MODE_ENABLED) {
      setVouchers([])
      return
    }

    try {
      const data = await getVouchers({ status, type, search })
      setVouchers(data)
    } catch (error) {
      showError('Không thể tải danh sách mã giảm giá')
    }
  }, [search, showError, status, type])

  useEffect(() => {
    loadVouchers()
  }, [loadVouchers])

  const handleCreate = () => {
    if (!DEMO_VOUCHER_MODE_ENABLED) return
    setEditingVoucher(null)
    setFormOpen(true)
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setFormOpen(true)
  }

  const handleSubmit = async (data: Omit<Voucher, 'id'>) => {
    try {
      if (editingVoucher) {
        await updateVoucher(editingVoucher.id, data)
        showSuccess('Cập nhật mã giảm giá thành công')
      } else {
        await createVoucher(data)
        showSuccess('Tạo mã giảm giá thành công')
      }
      await loadVouchers()
      setFormOpen(false)
      setEditingVoucher(null)
    } catch (error) {
      showError('Không thể lưu mã giảm giá')
    }
  }

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    try {
      await deleteVoucher(deleteConfirm.id)
      showSuccess('Xóa mã giảm giá thành công')
      await loadVouchers()
    } catch (error) {
      showError('Không thể xóa mã giảm giá')
    } finally {
      setDeleteConfirm({ open: false, id: null })
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Quản lý mã giảm giá</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!DEMO_VOUCHER_MODE_ENABLED}>
          Tạo mã giảm giá
        </Button>
      </Box>

      {!DEMO_VOUCHER_MODE_ENABLED && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Quản lý mã giảm giá hiện là chức năng demo/dev-only. Backend chưa có API CRUD voucher thật.
          Nếu cần xem demo local, bật <code>VITE_ENABLE_DEMO_VOUCHERS=true</code> trong frontend env rồi reload.
        </Alert>
      )}

      <VoucherFilters
        status={status}
        type={type}
        search={search}
        onStatusChange={setStatus}
        onTypeChange={setType}
        onSearchChange={setSearch}
      />

      <VoucherTable vouchers={vouchers} onEdit={handleEdit} onDelete={handleDelete} />

      <VoucherForm
        open={formOpen}
        voucher={editingVoucher}
        onClose={() => {
          setFormOpen(false)
          setEditingVoucher(null)
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        message="Bạn có chắc chắn muốn xóa mã giảm giá này?"
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        variant="danger"
      />
    </Box>
  )
}

