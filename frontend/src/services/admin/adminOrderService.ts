// Admin Order Service — nguồn duy nhất cho quản lý đơn hàng trong admin.
//
// Thay thế salesService.ts + preOrderService.ts (đã xoá). Hai file cũ map
// cùng một endpoint /orders bằng 2 bộ enum type/status tự chế, lệch khỏi
// enum thật trong Postgres (xem app/models.py: loai_don_hang, trang_thai_don_hang)
// — nên lọc "Đặt trước" hoặc lọc trạng thái "Hoàn thành"/"Đã hủy" ở trang cũ
// luôn âm thầm trả rỗng, và preOrderService còn đọc field `chi_tiet` mà
// backend không bao giờ trả (chỉ có `items`) nên danh sách sản phẩm trong
// đơn đặt trước luôn rỗng. Service này dùng thẳng string enum thật, không
// còn lớp map có thể lệch.
import { apiClient } from '../api'
import type { Order, OrderItem, OrderStatus, OrderType } from '../../types/admin'
import { toAmount, type BackendOrder, type BackendOrderItem } from '../../types/api/order'

function mapItems(raw?: BackendOrderItem[] | null): OrderItem[] {
  return (raw || []).map((item) => ({
    productName: item.product_name || 'Sản phẩm không xác định',
    size: '-',
    quantity: Number(item.so_luong) || 0,
    price: toAmount(item.gia_don_vi),
  }))
}

function mapOrder(raw: BackendOrder): Order {
  return {
    id: String(raw.donhang_id),
    orderCode: raw.ma_don_hang || `#${raw.donhang_id}`,
    orderType: (raw.loai_don as OrderType) || 'pos',
    status: (raw.trang_thai as OrderStatus) || 'cho',
    customerName: raw.ten_khach_hang || 'Khách hàng',
    phone: raw.so_dien_thoai_khach || '',
    address: raw.dia_chi_giao_hang || undefined,
    date: raw.ngay_tao,
    expectedDate: raw.ngay_giao_du_kien || undefined,
    items: mapItems(raw.items),
    totalAmount: toAmount(raw.tien_thanh_toan),
    subtotal: toAmount(raw.tong_tien),
    discount: toAmount(raw.tien_giam_gia),
    deposit: toAmount(raw.tien_dat_coc),
    notes: raw.ghi_chu || undefined,
  }
}

export interface OrderListFilters {
  orderType?: OrderType | ''
  status?: OrderStatus | ''
  dateFrom?: string
  dateTo?: string
  amountFrom?: number
  amountTo?: number
  search?: string
}

export async function getOrders(filters?: OrderListFilters): Promise<Order[]> {
  const params: Record<string, string | number | boolean | null> = { limit: 100 }
  if (filters?.orderType) params.loai_don = filters.orderType
  if (filters?.status) params.trang_thai = filters.status
  if (filters?.dateFrom) params.from_date = filters.dateFrom
  if (filters?.dateTo) params.to_date = filters.dateTo
  if (filters?.search) params.ma_don_hang = filters.search

  const response = await apiClient.get<BackendOrder[]>('/orders', params)
  let orders = response.map(mapOrder)

  if (filters?.amountFrom !== undefined) {
    orders = orders.filter((order) => order.totalAmount >= filters.amountFrom!)
  }
  if (filters?.amountTo !== undefined) {
    orders = orders.filter((order) => order.totalAmount <= filters.amountTo!)
  }

  return orders
}

export async function getOrderById(id: string): Promise<Order> {
  const orderId = Number(id)
  if (Number.isNaN(orderId)) throw new Error('Order ID is invalid')
  const response = await apiClient.get<BackendOrder>(`/orders/${orderId}`)
  return mapOrder(response)
}

/**
 * Đổi trạng thái qua endpoint chung. KHÔNG dùng để hủy đơn — dùng
 * cancelOrder() cho việc đó, đường đó mới hoàn tồn kho/voucher. Backend tự
 * chặn (400) nếu đơn đang ở trạng thái cuối (hoan_thanh/da_huy).
 */
export async function updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
  const response = await apiClient.patch<BackendOrder>(`/orders/${id}/status`, {
    trang_thai: status,
    ghi_chu: note || undefined,
  })
  return mapOrder(response)
}

/** Hủy đơn — hoàn tồn kho + lượt dùng voucher đã trừ khi tạo đơn. */
export async function cancelOrder(id: string, reason: string): Promise<Order> {
  const response = await apiClient.post<BackendOrder>(`/orders/${id}/cancel`, undefined, {
    params: { ly_do: reason },
  })
  return mapOrder(response)
}

/**
 * Xoá vĩnh viễn — chỉ thành công với đơn chưa từng phát sinh lịch sử kho
 * (backend chặn bằng FK nếu đã có). Đơn đã xử lý thì dùng cancelOrder().
 */
export async function deleteOrder(id: string): Promise<void> {
  await apiClient.delete(`/orders/${id}`)
}

export interface CreateOrderLineItem {
  bienthe_id?: number
  hop_qua_id?: number
  so_luong: number
}

export interface CreateOrderPayload {
  /** Đơn tạo thủ công từ admin chỉ có 2 loại — "online" luôn đến từ storefront. */
  loai_don: 'pos' | 'dat_truoc'
  items: CreateOrderLineItem[]
  ten_khach_hang?: string
  so_dien_thoai_khach?: string
  dia_chi_giao_hang?: string
  ngay_giao_du_kien?: string
  tien_dat_coc?: number
  ghi_chu?: string
  phieu_giam_gia_codes?: string[]
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { loai_don, ...body } = payload
  const response = await apiClient.post<BackendOrder>('/orders', body, { params: { loai_don } })
  return mapOrder(response)
}
