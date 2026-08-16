import { Chip, IconButton } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import { useNavigate } from 'react-router-dom'
import DataTable, { type Column } from '../ui/data-table'
import type { Order } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, ORDER_TYPE_COLOR, ORDER_TYPE_LABEL } from '../../../config/orderLabels'

interface OrdersTableProps {
  orders: Order[]
  status?: 'idle' | 'loading' | 'error'
  onDelete: (id: string) => void
}

const columns: Column<Order>[] = [
  { id: 'orderCode', label: 'Mã đơn' },
  { id: 'orderType', label: 'Loại', render: (row) => <Chip size="small" color={ORDER_TYPE_COLOR[row.orderType]} label={ORDER_TYPE_LABEL[row.orderType]} /> },
  { id: 'customerName', label: 'Khách hàng' },
  { id: 'phone', label: 'Số điện thoại', render: (row) => row.phone || '—' },
  { id: 'totalAmount', label: 'Tổng tiền', numeric: true, render: (row) => formatPrice(row.totalAmount) },
  { id: 'status', label: 'Trạng thái', render: (row) => <Chip size="small" color={ORDER_STATUS_COLOR[row.status]} label={ORDER_STATUS_LABEL[row.status]} /> },
  { id: 'expectedDate', label: 'Ngày giao/lấy', render: (row) => (row.expectedDate ? new Date(row.expectedDate).toLocaleDateString('vi-VN') : '—') },
  { id: 'date', label: 'Ngày tạo', sortable: true, render: (row) => new Date(row.date).toLocaleDateString('vi-VN') },
]

export default function OrdersTable({ orders, status = 'idle', onDelete }: OrdersTableProps) {
  const navigate = useNavigate()
  return (
    <DataTable
      caption="Danh sách đơn hàng"
      columns={columns}
      rows={orders}
      status={status}
      getRowId={(row) => row.id}
      getRowLabel={(row) => `${row.orderCode} · ${row.customerName}`}
      total={orders.length}
      page={0}
      pageSize={Math.max(25, orders.length || 25)}
      onPageChange={() => undefined}
      onPageSizeChange={() => undefined}
      onRowClick={(row) => navigate(`/admin/orders/${row.id}`)}
      rowActions={(row) => (
        <>
          <IconButton size="small" aria-label="Xem đơn hàng" onClick={() => navigate(`/admin/orders/${row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
          <IconButton size="small" aria-label="Xóa đơn hàng" onClick={() => onDelete(row.id)}><DeleteIcon fontSize="small" /></IconButton>
        </>
      )}
    />
  )
}
