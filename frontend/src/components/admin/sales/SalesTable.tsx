import { Chip, IconButton } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import { useNavigate } from 'react-router-dom'
import DataTable, { type Column } from '../ui/data-table'
import { Order } from '../../../types/admin'
import { formatPrice } from '../../../utils/formatPrice'

interface SalesTableProps {
  orders: Order[]
  onDelete: (id: string) => void
}

const statusColor: Record<Order['status'], 'default' | 'primary' | 'info' | 'warning' | 'success' | 'error'> = {
  pending: 'warning', processing: 'info', delivering: 'primary', completed: 'success', canceled: 'error',
}

const statusLabel: Record<Order['status'], string> = {
  pending: 'Chờ xử lý', processing: 'Đang xử lý', delivering: 'Đang giao', completed: 'Hoàn thành', canceled: 'Đã hủy',
}

const typeLabel: Record<Order['orderType'], string> = { online: 'Trực tuyến', pos: 'Tại cửa hàng', preorder: 'Đặt trước' }

const columns: Column<Order>[] = [
  { id: 'id', label: 'Mã đơn', sortable: true },
  { id: 'orderType', label: 'Loại', render: (row) => <Chip size="small" label={typeLabel[row.orderType]} /> },
  { id: 'customerName', label: 'Khách hàng' },
  { id: 'date', label: 'Ngày', sortable: true, render: (row) => new Date(row.date).toLocaleString('vi-VN') },
  { id: 'items', label: 'Sản phẩm', numeric: true, render: (row) => row.items.length },
  { id: 'totalAmount', label: 'Tổng tiền', numeric: true, render: (row) => formatPrice(row.totalAmount) },
  { id: 'paymentMethod', label: 'Thanh toán' },
  { id: 'status', label: 'Trạng thái', render: (row) => <Chip size="small" color={statusColor[row.status]} label={statusLabel[row.status]} /> },
]

export default function SalesTable({ orders, onDelete }: SalesTableProps) {
  const navigate = useNavigate()
  return (
    <DataTable
      caption="Danh sách đơn bán hàng"
      columns={columns}
      rows={orders}
      getRowId={(row) => row.id}
      getRowLabel={(row) => `${row.id} · ${row.customerName}`}
      total={orders.length}
      page={0}
      pageSize={Math.max(25, orders.length || 25)}
      onPageChange={() => undefined}
      onPageSizeChange={() => undefined}
      onRowClick={(row) => navigate(`/admin/sales/${row.id}`)}
      rowActions={(row) => (
        <>
          <IconButton size="small" aria-label="Xem đơn hàng" onClick={() => navigate(`/admin/sales/${row.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
          <IconButton size="small" aria-label="Xóa đơn hàng" onClick={() => onDelete(row.id)}><DeleteIcon fontSize="small" /></IconButton>
        </>
      )}
    />
  )
}
