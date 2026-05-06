// Admin Sales Service - API calls for sales/order management
import { Order } from '../../types/admin'
import { apiClient } from '../api'

export async function getOrders(filters?: {
  orderType?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  amountFrom?: number
  amountTo?: number
  search?: string
}): Promise<Order[]> {
  const params: Record<string, string | number | boolean | null> = {}
  if (filters?.orderType) params.loai_don = mapFrontendOrderTypeToBackend(filters.orderType)
  if (filters?.status) params.trang_thai = mapFrontendStatusToBackend(filters.status as Order['status'])
  if (filters?.dateFrom) params.from_date = filters.dateFrom
  if (filters?.dateTo) params.to_date = filters.dateTo
  if (filters?.search) params.ma_don_hang = filters.search

  const response = await apiClient.get<any[]>('/orders', Object.keys(params).length > 0 ? params : undefined)

  const orders: Order[] = response.map((item: any) => ({
    id: String(item.donhang_id),
    orderType: mapBackendOrderType(item.loai_don),
    customerName: item.ten_khach_hang || 'Khách hàng',
    date: item.ngay_tao,
    items: [],
    totalAmount: Number(item.tien_thanh_toan),
    paymentMethod: 'unknown',
    status: mapBackendStatus(item.trang_thai),
  }))

  let filtered = orders
  const amountFrom = filters?.amountFrom
  const amountTo = filters?.amountTo

  if (amountFrom !== undefined) {
    filtered = filtered.filter((order) => order.totalAmount >= amountFrom)
  }
  if (amountTo !== undefined) {
    filtered = filtered.filter((order) => order.totalAmount <= amountTo)
  }

  return filtered
}

function mapBackendStatus(backendStatus: string): Order['status'] {
  const statusMap: Record<string, Order['status']> = {
    cho: 'pending',
    dang_xu_ly: 'processing',
    thanh_toan: 'completed',
    da_nhan: 'completed',
    huy: 'canceled',
  }
  return statusMap[backendStatus] || 'pending'
}

function mapFrontendStatusToBackend(status: Order['status']): string {
  const statusMap: Record<Order['status'], string> = {
    pending: 'cho',
    processing: 'dang_xu_ly',
    delivering: 'dang_xu_ly',
    completed: 'da_nhan',
    canceled: 'huy',
  }
  return statusMap[status]
}

function mapBackendOrderType(type: string): Order['orderType'] {
  if (type === 'dattruoc') return 'preorder'
  if (type === 'online') return 'online'
  return 'pos'
}

function mapFrontendOrderTypeToBackend(type: string): string {
  if (type === 'preorder') return 'dattruoc'
  return type
}

function mapOrderDetailResponse(item: any): Order {
  return {
    id: String(item.donhang_id),
    orderType: mapBackendOrderType(item.loai_don),
    customerName: item.ten_khach_hang || 'Khách hàng',
    date: item.ngay_tao,
    items: (item.items || []).map((orderItem: any) => ({
      productName: orderItem.hop_qua_id
        ? `Hộp quà #${orderItem.hop_qua_id}`
        : orderItem.lohang_sanpham_id
          ? `Biến thể #${orderItem.lohang_sanpham_id}`
          : 'Sản phẩm',
      size: '-',
      quantity: Number(orderItem.so_luong) || 0,
      price: Number(orderItem.gia_don_vi) || 0,
    })),
    totalAmount: Number(item.tien_thanh_toan),
    paymentMethod: 'unknown',
    status: mapBackendStatus(item.trang_thai),
  }
}

export async function getOrderById(id: string): Promise<Order> {
  const orderId = Number(id)
  if (Number.isNaN(orderId)) {
    throw new Error('Order ID is invalid')
  }
  const response = await apiClient.get<any>(`/orders/${orderId}`)
  return mapOrderDetailResponse(response)
}

export async function updateOrderStatus(
  id: string,
  status: Order['status']
): Promise<Order> {
  const orderId = Number(id)
  if (Number.isNaN(orderId)) {
    throw new Error('Order ID is invalid')
  }
  const response = await apiClient.patch<any>(`/orders/${orderId}/status`, {
    trang_thai: mapFrontendStatusToBackend(status),
  })
  return mapOrderDetailResponse(response)
}

export async function deleteOrder(id: string): Promise<void> {
  await apiClient.delete(`/orders/${id}`)
}
