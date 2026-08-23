// Admin Voucher Management Page
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import AdminPage from '../../components/admin/ui/admin-page'
import VoucherTable from '../../components/admin/vouchers/VoucherTable'
import VoucherFilters from '../../components/admin/vouchers/VoucherFilters'
import VoucherForm from '../../components/admin/vouchers/VoucherForm'
import {
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from '../../services/admin/voucherService'
import { Voucher } from '../../types/admin'
import { useToast } from '../../contexts/ToastContext'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import { downloadCsv } from '../../utils/admin/exportCsv'
import { useAdminCreateAction } from '../../contexts/AdminCreateActionContext'

export default function AdminVoucherPage() {
  const { showSuccess, showError } = useToast()
  const table = useDataTableState({ key: 'vouchers', defaultSortBy: 'ngay_tao', defaultSortDir: 'desc', defaultPageSize: 50, filterKeys: ['status', 'type', 'search'] })
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [total, setTotal] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })

  // Filters — vào URL qua table.filters (spec 10 §5)
  const { status = '', type = '', search = '' } = table.filters
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const filtersKey = JSON.stringify(table.filters)
  useEffect(() => { setSelected(new Set()) }, [table.sortBy, table.sortDir, filtersKey])

  const loadVouchers = useCallback(async () => {
    try {
      const data = await getVouchers({ status, type, search, skip: table.skip, limit: table.pageSize, sort_by: table.sortBy, sort_dir: table.sortDir })
      setVouchers(data.items); setTotal(data.total)
    } catch (error) {
      showError('Không thể tải danh sách mã giảm giá')
    }
  }, [search, showError, status, table.pageSize, table.skip, table.sortBy, table.sortDir, type])

  useEffect(() => {
    loadVouchers()
  }, [loadVouchers])

  const handleCreate = () => {
    setEditingVoucher(null)
    setFormOpen(true)
  }
  useAdminCreateAction(handleCreate)

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

  const exportSelected = () => {
    const rows = vouchers.filter((v) => selected.has(v.id))
    downloadCsv(
      `ma-giam-gia-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Mã', 'Loại', 'Giá trị', 'Áp dụng', 'Đơn tối thiểu', 'Giới hạn', 'Hết hạn', 'Trạng thái'],
      rows.map((v) => [v.code, v.type, v.discountValue, v.appliesTo, v.minOrderValue ?? '', v.usageLimit ?? '', v.expiresAt, v.status]),
    )
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
    <AdminPage
      title="Mã giảm giá"
      breadcrumb={[{ label: 'Mã giảm giá' }]}
      actions={<Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>Tạo mã giảm giá</Button>}
    >
      <VoucherFilters
        status={status}
        type={type}
        search={search}
        onStatusChange={(value) => table.patch({ filters: { ...table.filters, status: value } })}
        onTypeChange={(value) => table.patch({ filters: { ...table.filters, type: value } })}
        onSearchChange={(value) => table.patch({ filters: { ...table.filters, search: value } })}
      />

      <VoucherTable
        vouchers={vouchers} onEdit={handleEdit} onDelete={handleDelete} total={total} page={table.page} pageSize={table.pageSize}
        onPageChange={(page) => table.patch({ page })} onPageSizeChange={(pageSize) => table.patch({ pageSize })}
        sortBy={table.sortBy} sortDir={table.sortDir} onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })}
        selectedIds={selected} onSelectionChange={setSelected}
        bulkActions={<Button size="small" startIcon={<FileDownloadIcon />} onClick={exportSelected}>Xuất CSV</Button>}
      />

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
    </AdminPage>
  )
}

